/* Движок историй «Рядом» (v3). Истории — данные: stories/<id>.json.
 *
 * Игровые принципы (общие для всех историй):
 *  • Время ограничено: слоты (день/вечер) и «силы» 0–5. Встреч больше, чем слотов.
 *  • Предметы в сцене дают информацию и открывают варианты. Варианты перемешаны; у каждого своя цена.
 *  • Доверие и ясность скрыты: игрок видит слова и заметки, не проценты.
 *  • Последствия отложены и зависят от флагов; пропущенное тоже последствие.
 *  • Финал и эпилог собираются из состояния; в конце — пересказ пути, а не оценка.
 *
 * Мини-язык данных (см. 02_Документация/05_Игра.md):
 *   условие   {flag}, {clue}, {done}, {trust:[npc,op,n]}, {clarity:[op,n]}, {energy:[op,n]}, {day:[op,n]},
 *             {route}, {all:[]}, {any:[]}, {not:cond}; массив = все условия сразу
 *   эффект    {trust:[npc,±n]}, {clarity:±n}, {energy:±n}, {flag}, {clue}; у любого можно поле "if"
 *   текст     строка | массив частей (склеиваются пробелом) | {if,text} | {cases:[{if?,text}]}
 */
(function () {
  'use strict';

  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  function h(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function rng(seed) { let x = 2166136261; for (const c of String(seed)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }
  function shuffled(arr, seed) { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------- мини-язык: условия, эффекты, тексты ---------- */
  const cmp = (a, op, b) => (op === '>=' ? a >= b : op === '>' ? a > b : op === '<=' ? a <= b : op === '<' ? a < b : op === '==' ? a === b : a !== b);
  function test(c, s) {
    if (c == null || c === true) return true;
    if (Array.isArray(c)) return c.every(x => test(x, s));
    if (c.all) return c.all.every(x => test(x, s));
    if (c.any) return c.any.some(x => test(x, s));
    if ('not' in c) return !test(c.not, s);
    if ('flag' in c) return !!s.flags[c.flag];
    if ('clue' in c) return s.clues.includes(c.clue);
    if ('done' in c) return s.done.includes(c.done);
    if ('route' in c) return s.route === c.route;
    if ('trust' in c) return cmp(s.trust[c.trust[0]], c.trust[1], c.trust[2]);
    if ('clarity' in c) return cmp(s.clarity, c.clarity[0], c.clarity[1]);
    if ('energy' in c) return cmp(s.energy, c.energy[0], c.energy[1]);
    if ('day' in c) return cmp(s.day, c.day[0], c.day[1]);
    return true;
  }
  function fx(list, s) {
    (list || []).forEach(e => {
      if (e.if !== undefined && !test(e.if, s)) return;
      if (e.trust) s.trust[e.trust[0]] = clamp(s.trust[e.trust[0]] + e.trust[1]);
      if ('clarity' in e) s.clarity = clamp(s.clarity + e.clarity, 0, 6);
      if ('energy' in e) s.energy = clamp(s.energy + e.energy, 0, 5);
      if (e.flag) s.flags[e.flag] = true;
      if (e.clue && !s.clues.includes(e.clue)) s.clues.push(e.clue);
    });
  }
  function T(spec, s) {
    if (spec == null) return '';
    if (typeof spec === 'string') return spec;
    if (Array.isArray(spec)) return spec.map(x => T(x, s)).filter(Boolean).join(' ');
    if (spec.cases) { for (const c of spec.cases) if (test(c.if, s)) return T(c.text, s); return ''; }
    if ('if' in spec) return test(spec.if, s) ? T(spec.text, s) : '';
    return spec.text || '';
  }

  /* ---------- загрузка историй ---------- */
  const STORIES = {};
  const KEYS = { 'tihiy-gorod': 'ryadom-story-v2' };
  const keyOf = id => KEYS[id] || 'ryadom-story-v2-' + id;
  function prep(j) { j.byId = {}; j.scenes.forEach(sc => { j.byId[sc.id] = sc; }); return j; }
  function loadStory(id) {
    if (STORIES[id]) return Promise.resolve(STORIES[id]);
    const ru = 'stories/' + id + '.json', p = window.RyadomI18n ? window.RyadomI18n.contentPath('stories', id) : ru;
    const get = u => fetch(u).then(r => { if (!r.ok) throw new Error('http'); return r.json(); });
    return get(p).catch(e => { if (p !== ru) return get(ru); throw e; })
      .catch(() => { if (window.QC_INLINE && window.QC_INLINE[id]) return window.QC_INLINE[id]; throw new Error('story-load'); })
      .then(j => { STORIES[id] = prep(j); return STORIES[id]; });
  }

  /* ---------- состояние ---------- */
  let ST = null, S = null, curId = null;
  function load(id) { try { const x = JSON.parse(localStorage.getItem(keyOf(id)) || 'null'); return x && x.version === 2 ? x : null; } catch { return null; } }
  function persist() { try { localStorage.setItem(keyOf(curId), JSON.stringify(S)); } catch { /* приватный режим */ } refreshHub(); }
  function fresh(st, name) {
    const trust = {}; Object.keys(st.npcs).forEach(k => { trust[k] = 50; });
    return { version: 2, name: name || st.hero.defaultName, phase: 'scene', day: 0, slot: 0, cur: { id: st.opener, picked: null }, seen: [], done: [], clues: [], flags: {}, trust, clarity: 0, energy: st.energy || 5, log: [], route: null };
  }
  const nSlots = () => ST.days.length * 2;
  const slotIndex = s => s.day * 2 + s.slot;
  const slotType = s => (s.slot === 0 ? 'day' : 'eve');
  const isOpener = s => s.cur && s.cur.id === ST.opener;
  const whenOf = (sc, s) => sc.when || (sc.id === 'final' ? ST.final.when : ST.days[s.day] + ', ' + ST.slots[s.slot]);
  const moodWord = (s, k) => { const n = ST.npcs[k]; if (n.fixedWord) return n.fixedWord; const t = s.trust[k]; return n.words[t < 30 ? 0 : t < 48 ? 1 : t < 66 ? 2 : 3]; };
  const headWord = s => (s.clarity < 2 ? 'в голове туман' : s.clarity < 4 ? 'мысли складываются' : 'ясно в голове');
  const npcShown = (k, s) => { const n = ST.npcs[k]; return !n.showIf || test(n.showIf, s); };

  /* ---------- ход игры ---------- */
  function startScene(id) {
    const sc = ST.byId[id]; S.cur = { id, picked: null }; S.seen = []; S.phase = 'scene';
    fx([{ energy: -(sc.cost || 0) }], S); persist(); render();
  }
  function takeRest() { S.cur = { id: 'rest', picked: null }; fx([{ energy: 2 }], S); S.log.push({ slot: slotIndex(S), id: 'rest' }); advance(); persist(); render(); }
  function choose(sc, ch) {
    fx([{ energy: -(ch.cost || 0) }], S); fx(ch.fx, S);
    S.cur.picked = ch.id; S.phase = 'result';
    if (!S.done.includes(sc.id)) S.done.push(sc.id);
    S.log.push({ slot: sc.id === ST.opener ? -1 : slotIndex(S), id: sc.id, choice: ch.id });
    persist(); render();
  }
  function advance() {
    if (S.cur && S.cur.id === ST.opener) { S.phase = 'hub'; S.day = 0; S.slot = 0; return; }
    S.slot++;
    if (S.slot > 1) { S.slot = 0; S.day++; fx([{ energy: ST.nextDayEnergy == null ? 1 : ST.nextDayEnergy }], S); }
    if (S.day >= ST.days.length) { enterFinal(); } else S.phase = 'hub';
  }
  function enterFinal() { fx(ST.final.onEnter, S); S.phase = 'final'; S.cur = { id: 'final', picked: null }; }

  /* ---------- отрисовка ---------- */
  function frame() {
    document.querySelector('#gamesHub').hidden = true;
    const root = document.querySelector('#gamePlay'); root.hidden = false; root.replaceChildren(); root.className = 'qc';
    const top = h('div', 'qc-top'); const back = h('button', null, '← К играм'); back.type = 'button'; back.onclick = () => showHub();
    top.append(back, h('span', null, ST.label)); root.append(top); return root;
  }
  function portrait(k, name, word, isHero) {
    const p = h('div', 'qc-portrait' + (isHero ? ' hero' : ''));
    const f = h('span', 'qc-face', (name || '?').charAt(0).toUpperCase()); if (!isHero && ST.npcs[k]) f.style.setProperty('--ink', ST.npcs[k].ink);
    p.append(f, h('b', null, name)); if (word) p.append(h('small', null, word)); return p;
  }
  const HERO_LOOK = { top: '#3d6b57', hair: '#3a2a22', skin: 1, style: 'curly' };
  function lookOf(k) { const n = ST.npcs[k] || {}; return Object.assign({ top: n.ink, style: 'short', skin: 0, hair: '#3a2a22' }, n.look || {}); }
  function stage(sc, whoList) {
    const F = window.RyadomFigures, art = F && F.has(sc.bg);
    const st = h('div', 'qc-stage ' + (art ? 'qc-artstage' : 'qc-bg-' + (sc.bg || 'street')));
    if (art) { const call = sc.icon === '☎' || sc.icon === '📱'; const hero = Object.assign({}, HERO_LOOK, ST.hero.look || {}, call ? { hold: 'phone' } : {});
      st.insertAdjacentHTML('afterbegin', F.scene(sc.bg, [hero].concat(call ? [] : (whoList || []).map(lookOf)), sc.place)); }
    st.append(h('span', 'qc-place', sc.place + ' · ' + whenOf(sc, S)));
    const people = h('div', 'qc-people'); people.append(portrait('hero', S.name, headWord(S), true));
    (whoList || []).forEach(k => people.append(portrait(k, ST.npcs[k].name, moodWord(S, k))));
    st.append(people); return st;
  }
  function statusBar(final) {
    const bar = h('div', 'qc-status'); const when = h('div', 'qc-when');
    const first = (S.phase === 'scene' || S.phase === 'result') && isOpener(S);
    when.append(h('b', null, final ? ST.final.dayLabel : first ? ST.openerWhen : ST.days[Math.min(S.day, ST.days.length - 1)] + ' · ' + ST.slots[S.slot]));
    when.append(h('small', null, ST.deadline)); bar.append(when);
    const track = h('div', 'qc-track'); track.setAttribute('aria-label', 'Время');
    const idx = final ? nSlots() : slotIndex(S);
    for (let i = 0; i < nSlots(); i++) { const seg = h('i'); if (i < idx) seg.className = 'done'; else if (i === idx) seg.className = 'now'; track.append(seg); }
    bar.append(track);
    const en = h('div', 'qc-energy'); en.setAttribute('aria-label', 'Силы: ' + S.energy + ' из 5'); en.append(h('span', null, 'Силы'));
    for (let i = 0; i < 5; i++) en.append(h('b', i < S.energy ? 'on' : ''));
    bar.append(en); return bar;
  }
  function sidebar() {
    const side = h('div', 'qc-side'); const c1 = h('div', 'qc-card'); c1.append(h('h3', null, 'Рядом'));
    const list = h('ul', 'qc-moods');
    Object.keys(ST.npcs).filter(k => npcShown(k, S)).forEach(k => { const li = h('li'); li.append(h('span', null, ST.npcs[k].name), h('em', null, moodWord(S, k))); list.append(li); });
    c1.append(list, h('p', 'qc-hint', 'Это состояние внутри сюжета, а не оценка твоих отношений в жизни.'));
    const c2 = h('div', 'qc-card'); c2.append(h('h3', null, 'Заметки')); const ul = h('ul', 'qc-notes');
    if (!S.clues.length) ul.append(h('li', 'empty', 'Пока пусто. Осматривай детали — они пригодятся.'));
    S.clues.slice(-6).forEach(id => ul.append(h('li', null, ST.clues[id] || id)));
    c2.append(ul); side.append(c1, c2); return side;
  }
  function quote(card, l) { if (!l) return; const q = h('blockquote'); q.append(h('span', null, ST.npcs[l.npc].name.toUpperCase()), h('p', null, l.text)); card.append(q); }
  function lineOf(sc) {
    if (!sc.line) return null;
    if (sc.line.cases) { for (const c of sc.line.cases) if (test(c.if, S)) return { npc: c.npc || sc.line.npc, text: c.text }; return null; }
    return sc.line;
  }

  function renderScene() {
    const sc = ST.byId[S.cur.id], root = frame();
    const head = h('header', 'qc-head'); head.append(h('span', 'qc-kicker', whenOf(sc, S).toUpperCase()), h('h2', null, sc.title), h('p', null, sc.place)); root.append(head, statusBar());
    const shell = h('div', 'qc-shell'), main = h('div', 'qc-main'); main.append(stage(sc, sc.who));
    const card = h('div', 'qc-narr'); card.append(h('p', 'qc-intro', T(sc.intro, S))); quote(card, lineOf(sc));
    const objs = h('div', 'qc-objects');
    sc.objects.forEach(o => {
      const seen = S.seen.includes(o.id); const b = h('button', 'qc-obj' + (seen ? ' seen' : '')); b.type = 'button';
      b.append(h('span', 'qc-obj-icon', o.icon), h('span', 'qc-obj-label', o.label), h('small', null, seen ? 'осмотрено' : 'осмотреть'));
      b.onclick = () => { if (!S.seen.includes(o.id)) { S.seen.push(o.id); fx(o.fx, S); persist(); } render(); };
      if (S.phase === 'result') b.disabled = true; objs.append(b);
    });
    card.append(objs);
    const seenObjs = sc.objects.filter(o => S.seen.includes(o.id));
    if (seenObjs.length) { const info = h('div', 'qc-info'); seenObjs.forEach(o => info.append(h('p', null, o.icon + ' ' + T(o.text, S)))); card.append(info); }
    else if (S.phase === 'scene') card.append(h('p', 'qc-tip', 'Осмотр деталей необязателен, но иногда открывает то, чего нет в обычных вариантах.'));
    if (S.phase === 'scene') {
      card.append(h('h3', 'qc-ask', 'Что делаешь?'));
      const vis = shuffled(sc.choices, sc.id + '|' + slotIndex(S)).filter(c => test(c.req, S));
      const box = h('div', 'qc-choices');
      vis.forEach(ch => {
        const b = h('button', 'qc-choice'); b.type = 'button'; b.append(h('span', null, ch.text));
        const need = ch.cost || 0; if (need > 0) b.append(h('em', 'qc-cost', 'силы −' + need));
        if (S.energy < need) { b.disabled = true; b.title = 'Не хватает сил'; b.append(h('small', 'qc-lock', 'Не хватает сил на это.')); }
        b.onclick = () => choose(sc, ch); box.append(b);
      });
      card.append(box);
      if (sc.choices.length - vis.length > 0 && S.seen.length < sc.objects.length) card.append(h('p', 'qc-tip', 'Здесь можно заметить ещё что-то.'));
    } else {
      const ch = sc.choices.find(c => c.id === S.cur.picked); const res = h('div', 'qc-result');
      res.append(h('span', 'qc-tag', 'ТВОЙ ВЫБОР'), h('p', 'qc-picked', ch.text), h('blockquote', null, T(ch.result, S)), h('p', 'qc-trace', 'Запомнится: ' + ch.trace)); card.append(res);
      const last = slotIndex(S) >= nSlots() - 1 && !isOpener(S);
      const btn = h('button', 'qc-next', isOpener(S) ? ST.ui.afterOpener : last ? ST.ui.toFinal : 'Дальше →'); btn.type = 'button';
      btn.onclick = () => { advance(); persist(); render(); }; card.append(btn);
    }
    main.append(card); shell.append(main, sidebar()); root.append(shell);
  }

  function availableCards() {
    const t = slotType(S);
    return ST.scenes.filter(sc => sc.id !== ST.opener && (sc.slots === 'both' || sc.slots === t) && !S.done.includes(sc.id) && test(sc.avail, S));
  }
  function actCard(icon, title, who, teaser, cost, urgent, onClick, restores) {
    const b = h('button', 'qc-act' + (urgent ? ' urgent' : '')); b.type = 'button';
    b.append(h('span', 'qc-act-icon', icon), h('b', null, title), h('small', 'qc-act-who', who), h('p', null, teaser), h('em', 'qc-act-meta', restores ? 'восстанавливает силы' : cost ? 'силы −' + cost : 'без затрат сил'));
    if (!restores && S.energy < cost) { b.disabled = true; b.append(h('small', 'qc-lock', 'Не хватает сил — сначала отдохни.')); }
    if (urgent) b.append(h('span', 'qc-badge', 'ждёт ответа'));
    b.onclick = onClick; return b;
  }
  function renderHub() {
    const root = frame(); const head = h('header', 'qc-head');
    head.append(h('span', 'qc-kicker', ST.ui.weekLabel.replace('{n}', S.day + 1).replace('{total}', ST.days.length)), h('h2', null, ST.days[S.day] + ', ' + ST.slots[S.slot]), h('p', null, ST.ui.hubLead)); root.append(head, statusBar());
    const shell = h('div', 'qc-shell'), main = h('div', 'qc-main'), grid = h('div', 'qc-acts');
    availableCards().sort((a, b) => (test(b.urgent, S) && b.urgent ? 1 : 0) - (test(a.urgent, S) && a.urgent ? 1 : 0)).forEach(sc => {
      grid.append(actCard(sc.icon, sc.title, (sc.who || []).map(k => ST.npcs[k].name).join(', ') || 'Наедине с собой', T(sc.teaser, S), sc.cost || 0, sc.urgent && test(sc.urgent, S), () => startScene(sc.id)));
    });
    grid.append(actCard('☾', 'Отдохнуть', 'Наедине с собой', 'Выключить звук. Силы +2.', 0, false, takeRest, true));
    main.append(grid, h('p', 'qc-tip', ST.ui.hubTip)); shell.append(main, sidebar()); root.append(shell);
  }

  function renderFinal() {
    const root = frame(), F = ST.final;
    const fsc = { id: 'final', title: F.title, place: F.place, bg: F.bg };
    const present = (F.present || []).filter(p => test(p.if, S)).map(p => p.npc);
    const head = h('header', 'qc-head'); head.append(h('span', 'qc-kicker', F.when.toUpperCase()), h('h2', null, F.title), h('p', null, F.place + ' · ' + F.subtitle)); root.append(head, statusBar(true));
    const shell = h('div', 'qc-shell'), main = h('div', 'qc-main'); main.append(stage(fsc, present));
    const card = h('div', 'qc-narr'); card.append(h('p', 'qc-intro', T(F.intro, S)));
    const ln = (F.lines || []).find(l => test(l.if, S)); if (ln) quote(card, ln);
    if (S.phase === 'final') {
      card.append(h('h3', 'qc-ask', F.ask)); const box = h('div', 'qc-choices');
      shuffled(F.options, 'final|' + S.name).forEach(o => {
        const lock = (o.lock || []).find(l => test(l.when, S)); const b = h('button', 'qc-choice'); b.type = 'button'; b.append(h('span', null, T(o.text, S)));
        if (lock) { b.disabled = true; b.append(h('small', 'qc-lock', lock.reason)); }
        else b.onclick = () => { fx(o.fx, S); S.route = o.route; S.cur.picked = o.id; S.phase = 'finalresult'; S.log.push({ slot: 99, id: 'final', choice: o.id }); persist(); render(); };
        box.append(b);
      }); card.append(box);
    } else {
      const o = F.options.find(x => x.id === S.cur.picked); const res = h('div', 'qc-result');
      res.append(h('span', 'qc-tag', 'ТВОЙ ОТВЕТ'), h('p', 'qc-picked', T(o.text, S)), h('blockquote', null, T(o.result, S))); card.append(res);
      const btn = h('button', 'qc-next', ST.ui.toEpilogue); btn.type = 'button'; btn.onclick = () => { S.phase = 'epilogue'; persist(); render(); }; card.append(btn);
    }
    main.append(card); shell.append(main, sidebar()); root.append(shell);
  }

  function renderEpilogue() {
    const root = frame(), E = ST.epilogue, wrap = h('div', 'qc-epilogue');
    wrap.append(h('span', 'qc-kicker', E.kicker), h('h2', null, T(E.title, S)));
    E.paragraphs.map(p => T(p, S)).filter(Boolean).forEach(t => wrap.append(h('p', 'qc-epi', t)));
    const recap = h('section', 'qc-recap'); recap.append(h('h3', null, 'Твой путь')); const ul = h('ul');
    S.log.filter(x => x.slot !== 99).slice().sort((a, b) => a.slot - b.slot).forEach(x => {
      const li = h('li'); const when = x.slot < 0 ? ST.openerShort : ST.dayAbbr[Math.floor(x.slot / 2)] + ' · ' + ST.slots[x.slot % 2];
      if (x.id === 'rest') li.append(h('b', null, when), document.createTextNode('Отдых'));
      else { const sc = ST.byId[x.id], ch = sc.choices.find(c => c.id === x.choice); li.append(h('b', null, when), document.createTextNode(sc.title + ' — ' + ch.trace.replace(/\.$/, ''))); }
      ul.append(li);
    }); recap.append(ul);
    const missed = (E.recapMissed || []).filter(id => !S.done.includes(id));
    if (missed.length) {
      recap.append(h('h3', null, 'Что не случилось')); const m = h('ul', 'qc-missed'); missed.forEach(id => m.append(h('li', null, ST.byId[id].title))); recap.append(m);
      recap.append(h('p', 'qc-hint', 'Здесь ' + (ST.scenes.length - 1) + ' встреч на ' + nSlots() + ' слотов. Другие выборы откроют другие разговоры и другие варианты в финале.'));
    }
    wrap.append(recap, h('p', 'qc-hint', 'Это финал игрового сюжета, а не оценка отношений в жизни. Показатели внутри игры не отображаются и не сохраняются как «результат».'));
    const actions = h('div', 'qc-actions');
    const again = h('button', 'qc-next', E.again); again.type = 'button'; again.onclick = () => { S = fresh(ST, S.name); persist(); render(); };
    const hub = h('button', 'qc-ghost', 'К другим историям'); hub.type = 'button'; hub.onclick = () => showHub();
    actions.append(again, hub); wrap.append(actions); root.append(wrap);
  }
  function renderIntro() {
    const root = frame(), wrap = h('div', 'qc-intro-screen'), I = ST.intro;
    wrap.append(h('span', 'qc-kicker', I.kicker), h('h2', null, I.title)); I.paragraphs.forEach(p => wrap.append(h('p', null, p)));
    const box = h('div', 'qc-setup'); const lab = h('label', null, 'Как зовут героя?'); lab.htmlFor = 'heroName';
    const input = h('input'); input.id = 'heroName'; input.maxLength = 20; input.value = ST.hero.defaultName; input.setAttribute('autocomplete', 'off');
    const go = h('button', 'qc-next', 'Начать →'); go.type = 'button'; go.onclick = () => { S = fresh(ST, input.value.trim().slice(0, 20)); persist(); render(); };
    box.append(lab, input, go); wrap.append(box, h('p', 'qc-hint', I.disclaimer)); root.append(wrap);
  }
  function render() {
    if (!S) return renderIntro();
    switch (S.phase) {
      case 'hub': return renderHub();
      case 'final': case 'finalresult': return renderFinal();
      case 'epilogue': return renderEpilogue();
      default: return renderScene();
    }
  }

  /* ---------- вход ---------- */
  function showLoadError() {
    document.querySelector('#gamesHub').hidden = true;
    const root = document.querySelector('#gamePlay'); root.hidden = false; root.className = 'qc'; root.replaceChildren();
    const b = h('button', null, '← К играм'); b.onclick = () => showHub();
    root.append(b, h('p', 'qc-tip', 'Не удалось загрузить историю. Запусти приложение через локальный сервер (см. README), а не открывай index.html напрямую.'));
  }
  function openStory(id) {
    loadStory(id).then(st => { ST = st; curId = id; S = load(id); render(); }).catch(showLoadError);
  }
  window.RyadomStory = { open: openStory, state: () => S, story: () => ST, test, fx, T, STORIES };

  /* ---------- карточка главной истории на экране игр ---------- */
  function refreshHub() {
    const bar = document.querySelector('#hubProgress'), txt = document.querySelector('#hubProgressText'), btn = document.querySelector('#startGame');
    if (!bar || !txt || !btn) return;
    const s = (curId === 'tihiy-gorod' && S) ? S : load('tihiy-gorod');
    if (!s) { bar.style.width = '0%'; txt.textContent = 'Одна неделя, восемь слотов, пять единиц сил'; btn.textContent = 'Начать историю →'; return; }
    const total = 8;
    if (s.phase === 'epilogue') { bar.style.width = '100%'; txt.textContent = 'Неделя прожита · можно попробовать иначе'; btn.textContent = 'Посмотреть итог →'; return; }
    const fin = s.phase === 'final' || s.phase === 'finalresult', op = s.cur && s.cur.id === 'letter' && (s.phase === 'scene' || s.phase === 'result');
    const days = ['Вторник', 'Среда', 'Четверг', 'Пятница'];
    bar.style.width = Math.round((fin ? total : op ? 0 : s.day * 2 + s.slot) / total * 100) + '%';
    txt.textContent = fin ? 'Воскресенье · вокзал' : op ? 'Понедельник, утро' : days[Math.min(s.day, 3)] + ', ' + (s.slot ? 'вечер' : 'день') + ' · прогресс сохранён';
    btn.textContent = 'Продолжить историю →';
  }
  renderGameHub = refreshHub;
  const start = document.querySelector('#startGame'); if (start) start.onclick = () => openStory('tihiy-gorod');
  const feature = document.querySelector('.game-feature');
  if (feature) {
    const e = feature.querySelector('.eyebrow'); if (e) e.textContent = 'Сюжетная игра · одна неделя';
    const t = feature.querySelector('h2'); if (t) t.textContent = 'Тихий город: неделя до ответа';
    const p = feature.querySelector('p'); if (p) p.textContent = 'Письмо о работе в другом городе, мама, папа, подруга и восемь слотов времени. На всё не хватит — и каждая встреча оставит след.';
  }
  refreshHub();

  /* =====================================================================
   * Зарисовки (worlds.js). №1 «Границы без ссоры» теперь полноценная история
   * на этом движке; остальные 11 — прежние заготовки с честным рендером.
   * ===================================================================== */
  // Все миры — полноценные истории на этом движке. Обложки — свои векторные сцены (assets/scenes).
  const WORLD_STORIES = ['granitsy', 'trevoga', 'kritik', 'razgovor', 'net-sil', 'svoi-resheniya', 's-soboy', 'odinochestvo', 'vygoranie', 'poterya', 'telo', 'primirenie'];
  const WORLD_COVERS = ['boxes', 'night', 'studio', 'cafe2', 'calm', 'family', 'balcony', 'party', 'office', 'street2', 'park', 'metro'];
  // Полные истории есть по-русски; на других языках — по мере перевода (stories/<язык>/), иначе остаётся переведённая зарисовка.
  const STORY_LANGS = { ru: WORLD_STORIES, en: ['granitsy'] };
  const uiLang = window.RyadomI18n ? window.RyadomI18n.lang : 'ru';
  const READY = window.RYADOM_STORIES_READY || STORY_LANGS[uiLang] || ['granitsy'];
  const ENGINE_WORLDS = {}; WORLD_STORIES.forEach((id, i) => { if (READY.includes(id)) ENGINE_WORLDS[i] = id; });
  window.RyadomWorldStories = ENGINE_WORLDS;
  const bond = v => { const w = v < 35 ? 'напряжённо' : v < 55 ? 'неопределённо' : v < 72 ? 'теплее' : 'близко'; return window.RyadomI18n ? window.RyadomI18n.t(w) : w; };
  renderWorld = function () {
    const tr = x => typeof x === 'string' ? (window.RyadomI18n ? window.RyadomI18n.t(x) : x) : Array.isArray(x) ? x.map(tr) : x;
    const raw = worldSpecs[activeWorld], spec = Object.assign({}, raw, { title: tr(raw.title), hero: tr(raw.hero), other: tr(raw.other), relation: tr(raw.relation), agency: tr(raw.agency), scenes: tr(raw.scenes) });
    const s = worldState, root = worldFrame(); s.picks = s.picks || [];
    if (s.chapter >= 4) {
      const box = h('div', 'story-ending world-ending'); box.append(h('span', 'eyebrow', 'Зарисовка пройдена'), h('h2', null, spec.title), h('p', null, 'Вот путь, который сложился:'));
      const ul = h('ul', 'world-recap'); s.picks.forEach((pick, i) => { const sc = spec.scenes[i], o = sc[5 + pick]; const li = h('li'); li.append(h('b', null, sc[0] + ': '), document.createTextNode(o[0] + ' — ' + o[1])); ul.append(li); });
      box.append(ul, h('p', null, 'Между героями сейчас: ' + bond(s.relation) + '. Другие выборы вели бы в другие разговоры — зарисовку можно пройти иначе.'));
      const btn = h('button', 'primary', 'Сыграть иначе'); btn.onclick = () => startWorld(activeWorld, true);
      const home = h('button', 'secondary', 'К играм'); home.onclick = showHub; box.append(btn, home); root.append(box); return;
    }
    const scene = spec.scenes[s.chapter];
    const heading = h('div', 'story-title'); heading.append(h('h2', null, scene[0]), h('span', null, 'Сцена ' + (s.chapter + 1) + ' / 4')); root.append(heading);
    const pips = h('div', 'chapter-pips'); for (let i = 0; i < 4; i++) { const pip = h('i'); if (i <= s.chapter) pip.className = 'done'; pips.append(pip); } root.append(pips);
    const shell = h('div', 'story-shell'), main = h('div', 'story-main'), art = h('div', 'world world-alt world-theme-' + spec.theme);
    const figures = h('div', 'world-figures'); [spec.hero, spec.other].forEach(n => { const d = h('div'); d.innerHTML = '<span></span><b></b>'; d.querySelector('b').textContent = n; figures.append(d); });
    art.append(h('span', 'scene-label', spec.title + ' · ' + scene[0]), h('span', 'world-symbol', ['✉', '⌂', '☼', '◇'][s.chapter]), figures); main.append(art);
    const card = h('div', 'card scene-card'); say(card, 'Рассказчик', scene[1]); say(card, spec.other, scene[2].replace(spec.other + ': ', '').replace(spec.other + ':', ''));
    card.append(h('p', 'scene-info', 'Ты замечаешь: ' + scene[4]), h('div', 'scene-prompt', 'Что делает ' + spec.hero + '?'));
    const actions = h('div', 'scene-actions');
    if (s.choice == null) {
      shuffled([0, 1, 2], spec.title + '|' + s.chapter).forEach(i => { const o = scene[5 + i], b = h('button', null, o[0]); b.onclick = () => { s.choice = i; s.picks[s.chapter] = i; s.relation = clamp(s.relation + o[2], 5, 95); s.agency = clamp(s.agency + o[3], 5, 95); saveWorld(); renderWorld(); }; actions.append(b); });
      card.append(actions);
    } else {
      const chosen = scene[5 + s.choice]; say(card, spec.hero, chosen[0], true); say(card, spec.other, chosen[1]);
      const nx = h('button', 'primary scene-advance', s.chapter === 3 ? 'Увидеть, что сложилось →' : 'Дальше →'); nx.onclick = () => { s.chapter++; s.seen = false; s.choice = null; saveWorld(); renderWorld(); }; card.append(nx);
    }
    main.append(card); const side = h('div', 'story-side'), info = h('div', 'card');
    info.append(h('h3', null, 'Между героями'), h('p', 'scene-info', spec.relation + ': ' + bond(s.relation)), h('p', 'hint', 'Это состояние внутри сюжета. Оно не оценивает тебя и твои настоящие отношения.')); side.append(info); shell.append(main, side); root.append(shell);
  };
  const prevStart = startWorld;
  startWorld = function (i, restart) {
    if (ENGINE_WORLDS[i]) { if (restart) { try { localStorage.removeItem(keyOf(ENGINE_WORLDS[i])); } catch { /* */ } } return openStory(ENGINE_WORLDS[i]); }
    return prevStart(i, restart);
  };
  const grid = document.querySelector('#gameGrid');
  if (grid) [...grid.children].forEach((card, i) => {
    if (!card.querySelector('.gc-cover') && WORLD_COVERS[i]) { const c = h('span', 'gc-cover'); c.setAttribute('aria-hidden', 'true'); c.style.backgroundImage = "url('assets/scenes/covers/" + WORLD_COVERS[i] + ".svg')"; card.prepend(c); }
    const sm = card.querySelector('small'); if (sm && ENGINE_WORLDS[i]) sm.textContent = 'ИГРАТЬ · 2 ДНЯ';
  });
  const note2 = document.querySelector('.game-note');
  if (note2) note2.textContent = Object.keys(ENGINE_WORLDS).length === WORLD_STORIES.length
    ? 'Все истории полноценные: два дня, встречи на выбор, ограниченные силы и финал, который складывается из твоих решений.'
    : 'Первая история — полноценная, на том же движке, что «Тихий город». Остальные одиннадцать — короткие зарисовки на четыре сцены, их предстоит переписать так же.';
})();
