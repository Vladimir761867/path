# Сборщик историй «Рядом»: короткая запись → stories/<id>.json для движка game-v2.js
import json, re, os, sys

def fx(s):
    """'mama+6 c+1 e-1 !flag #clue' → список эффектов. Можно добавить '@if' через FX(..., if_=...)"""
    out = []
    for t in s.split():
        if t.startswith('!'): out.append({'flag': t[1:]})
        elif t.startswith('#'): out.append({'clue': t[1:]})
        else:
            m = re.fullmatch(r'([a-z_]+)([+-]\d+)', t)
            assert m, t
            k, n = m.group(1), int(m.group(2))
            if k == 'c': out.append({'clarity': n})
            elif k == 'e': out.append({'energy': n})
            else: out.append({'trust': [k, n]})
    return out

def FX(s, if_): return [dict(e, **{'if': if_}) for e in fx(s)]

# условия
def F(x): return {'flag': x}
def CL(x): return {'clue': x}
def DONE(x): return {'done': x}
def TR(n, op, v): return {'trust': [n, op, v]}
def CLR(op, v): return {'clarity': [op, v]}
def ANY(*a): return {'any': list(a)}
def ALL(*a): return {'all': list(a)}
def NOT(a): return {'not': a}
def R(x): return {'route': x}
def CASES(*pairs):
    """CASES((cond, text), ..., (None, text))"""
    return {'cases': [({'if': c, 'text': t} if c is not None else {'text': t}) for c, t in pairs]}

def obj(id, icon, label, text, f=''):
    return {'id': id, 'icon': icon, 'label': label, 'text': text, 'fx': fx(f) if isinstance(f, str) else f}

def ch(id, text, result, trace, f='', cost=0, req=None):
    d = {'id': id, 'text': text, 'cost': cost, 'fx': fx(f) if isinstance(f, str) else f, 'result': result, 'trace': trace}
    if req is not None: d['req'] = req
    return d

def scene(id, title, place, bg, icon, who, intro, choices, objects=(), line=None, slots='both', cost=0, teaser=None, avail=None, urgent=None, when=None):
    d = {'id': id, 'who': list(who), 'title': title, 'place': place, 'bg': bg, 'icon': icon, 'cost': cost, 'intro': intro,
         'objects': list(objects), 'choices': list(choices)}
    if when: d['when'] = when
    else: d['slots'] = slots
    if line: d['line'] = {'npc': line[0], 'text': line[1]} if isinstance(line, tuple) else line
    if teaser: d['teaser'] = teaser
    if avail is not None: d['avail'] = avail
    if urgent is not None: d['urgent'] = urgent
    return d

def opt(id, text, result, f='', lock=None):
    return {'id': id, 'route': id, 'text': text, 'lock': [{'when': w, 'reason': r} for w, r in (lock or [])], 'fx': fx(f) if isinstance(f, str) else f, 'result': result}

def story(id, label, hero, days, day_abbr, opener_when, opener_short, deadline, ui, intro, npcs, clues, scenes, final, epilogue, energy=5):
    return {'id': id, 'label': label, 'hero': {'defaultName': hero}, 'energy': energy, 'nextDayEnergy': 1,
            'days': days, 'dayAbbr': day_abbr, 'slots': ['день', 'вечер'], 'opener': scenes[0]['id'],
            'openerWhen': opener_when, 'openerShort': opener_short, 'deadline': deadline,
            'ui': ui, 'intro': intro, 'npcs': npcs, 'clues': clues, 'scenes': scenes, 'final': final, 'epilogue': epilogue}

def npc(name, ink, words, show_if=None):
    d = {'name': name, 'ink': ink, 'words': words}
    if show_if: d['showIf'] = show_if
    return d

def check(st):
    """Ссылки: npc, улики, сцены, флаги, которые проверяются, но нигде не ставятся."""
    errs = []; npcs = set(st['npcs']); clues = set(st['clues']); ids = {s['id'] for s in st['scenes']}
    set_flags, used_flags = set(), set()
    def walk(x, setting=False):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == 'trust' and isinstance(v, list) and v and v[0] not in npcs: errs.append('npc ' + str(v[0]))
                if k == 'clue' and isinstance(v, str) and v not in clues: errs.append('clue ' + v)
                if k == 'done' and v not in ids: errs.append('done ' + v)
                if k == 'npc' and v not in npcs: errs.append('npc ' + v)
                if k == 'flag': (set_flags if setting else used_flags).add(v)
                if k in ('fx', 'onEnter'): walk(v, True)
                elif k == 'if' and setting: walk(v, False)
                else: walk(v, setting)
        elif isinstance(x, list):
            for i in x: walk(i, setting)
    walk(st)
    for s in st['scenes']:
        for w in s['who']:
            if w not in npcs: errs.append('who ' + w)
        if s['id'] != st['opener'] and s.get('slots') not in ('day', 'eve', 'both'): errs.append('slots ' + s['id'])
    for m in st['epilogue'].get('recapMissed', []):
        if m not in ids: errs.append('missed ' + m)
    for f in used_flags - set_flags: errs.append('flag never set: ' + f)
    routes = {o['route'] for o in st['final']['options']}
    if len(st['scenes']) < 7: errs.append('мало сцен')
    return errs

def write(st, out_dir):
    e = check(st)
    if e: print(st['id'], 'ОШИБКИ:', e); sys.exit(1)
    with open(os.path.join(out_dir, st['id'] + '.json'), 'w') as f: json.dump(st, f, ensure_ascii=False, indent=1)
    print(st['id'], 'ok', len(st['scenes']), 'сцен', os.path.getsize(os.path.join(out_dir, st['id'] + '.json')) // 1024, 'КБ')

UI = lambda week: {'afterOpener': 'К двум дням →', 'toFinal': 'К решающему моменту →', 'toEpilogue': 'Что было дальше →', 'weekLabel': week,
                   'hubLead': 'Выбери, на что потратить это время. Всё не успеть.',
                   'hubTip': 'Встреч больше, чем времени: каждая закрывает другую, а пропущенное тоже оставляет след.'}
DISC = 'Вымышленная история. Выборы в игре никому ничего не отправляют и не оценивают твою настоящую жизнь.'
