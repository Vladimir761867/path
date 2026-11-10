/* Стартовый блок, «Подходит сейчас», маршруты и локальная статистика использования.
 * Всё хранится только в этом браузере (localStorage); ничего не отправляется. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const day = () => (typeof todayKey === 'function' ? todayKey() : new Date().toISOString().slice(0, 10));

  /* ---------- статистика (локально) ---------- */
  const SKEY = 'ryadom-stats-v1';
  const readS = () => { try { const x = JSON.parse(localStorage.getItem(SKEY) || '{}'); return x && typeof x === 'object' && x.days ? x : { days: {} }; } catch { return { days: {} }; } };
  const writeS = x => { try { localStorage.setItem(SKEY, JSON.stringify(x)); } catch { /* */ } };
  function hit(name) {
    const s = readS(), d = day(); s.days[d] = s.days[d] || {}; s.days[d][name] = (s.days[d][name] || 0) + 1;
    const keys = Object.keys(s.days).sort(); while (keys.length > 60) delete s.days[keys.shift()];
    writeS(s);
  }
  function totals(n) {
    const s = readS(), keys = Object.keys(s.days).sort().slice(-n), t = {};
    keys.forEach(k => Object.entries(s.days[k]).forEach(([a, b]) => { t[a] = (t[a] || 0) + b; }));
    return { days: keys.length, t };
  }
  window.RyadomStats = { hit, totals, reset: () => writeS({ days: {} }) };

  const _view = window.view || (typeof view === 'function' ? view : null);
  if (_view) {
    window.view = view = function (id) { _view(id); hit('view:' + id); if (id === 'library') renderNow(); if (id === 'profile') renderStats(); if (id === 'places') renderMine(); };
  }
  if (typeof openPractice === 'function') { const _op = openPractice; openPractice = function (k) { hit('practice'); return _op(k); }; }
  if (typeof respond === 'function') { const _rs = respond; respond = function (l, v) { if (l === v) hit('chat'); return _rs(l, v); }; }

  /* ---------- стартовый блок ---------- */
  function startRow() {
    const hero = $('#today .hero'); if (!hero || $('#startRow')) return;
    const box = h('div', 'start-row'); box.id = 'startRow';
    box.append(h('span', 'start-lab', 'С чего начать'));
    const mk = (t, d, f) => { const b = h('button', 'start-btn'); b.type = 'button'; b.append(h('b', null, t), h('small', null, d)); b.onclick = f; return b; };
    box.append(
      mk('Поговорить', 'Своими словами, без правил', () => { const i = $('#input'); if (i) i.focus(); }),
      mk('Потренировать разговор', 'Начальник, мама, отказ, извинение', () => { view('games'); setTimeout(() => { const q = $('.qz-section'); if (q) q.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); }),
      mk('Подобрать практику', 'Подходящую сейчас', () => view('library'))
    );
    hero.after(box);
    const msgs = $('#messages');
    const upd = () => { box.hidden = !!msgs.querySelector('.bubble.me'); };
    if (msgs) new MutationObserver(upd).observe(msgs, { childList: true }); upd();
  }

  /* ---------- «Подходит сейчас» и маршруты ---------- */
  const MOOD_TOPIC = { anxious: ['anxiety', 'stress'], hard: ['sadness', 'energy'], angry: ['anger', 'relations'], okay: ['calm', 'focus'], good: ['calm'] };
  const MOOD_RU = { anxious: 'тревожно', hard: 'тяжело', angry: 'злюсь', okay: 'нормально', good: 'хорошо' };
  function suggestNow() {
    const hist = (typeof history === 'function' ? history() : []);
    const recent = hist.filter(x => x.mood && (new Date(day() + 'T12:00:00') - new Date(x.day + 'T12:00:00')) / 864e5 <= 3).slice(-1)[0];
    const hr = new Date().getHours();
    const topics = new Map(); const bump = (t, w) => topics.set(t, (topics.get(t) || 0) + w);
    let why = '';
    if (recent) { (MOOD_TOPIC[recent.mood] || []).forEach((t, i) => bump(t, 6 - i * 2)); why = 'по последней отметке «' + (MOOD_RU[recent.mood] || recent.mood) + '»'; }
    if (hr >= 22 || hr < 5) { bump('sleep', 7); why = why ? why + ' и позднему времени' : 'потому что уже поздно'; }
    else if (hr >= 17) bump('stress', 2);
    if (!why) why = 'на каждый день';
    const score = {}; hist.filter(x => x.practice).forEach(x => { score[x.practice] = (score[x.practice] || 0) + (x.outcome === 'better' ? 3 : x.outcome === 'worse' ? -8 : 0); });
    const seed = k => { let a = 0; const s = k + day(); for (let i = 0; i < s.length; i++) a = (a * 31 + s.charCodeAt(i)) | 0; return (a % 100) / 100; };
    const list = Object.entries(practices).filter(([k]) => k !== 'flagship').map(([k, p]) => [k, p, (topics.get(p.topic) || 0) + (score[k] || 0) + seed(k) + (/^[12]\s*мин/.test(p.duration) ? 0.5 : 0)]).sort((a, b) => b[2] - a[2]);
    return { why, items: list.slice(0, 3) };
  }
  const CK = 'ryadom-chains-v1';
  const readC = () => { try { return JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch { return {}; } };
  const writeC = x => { try { localStorage.setItem(CK, JSON.stringify(x)); } catch { /* */ } };
  const CHAINS = [
    { id: 'boss', title: 'После трудного разговора с начальником', steps: [['p', 'ground'], ['p', 'extra51'], ['p', 'extra48'], ['q', 'boss-feedback'], ['p', 'extra50']] },
    { id: 'no', title: 'Научиться говорить «нет»', steps: [['p', 'extra16'], ['p', 'extra42'], ['q', 'refuse-colleague'], ['p', 'extra52']] },
    { id: 'close', title: 'Сложный разговор с близким', steps: [['p', 'extra41'], ['p', 'extra40'], ['q', 'mom-boundaries'], ['p', 'extra45']] },
    { id: 'repair', title: 'Помириться после ссоры', steps: [['p', 'extra43'], ['q', 'apology-friend'], ['p', 'extra47']] },
    { id: 'low', title: 'Когда совсем нет сил', steps: [['p', 'extra56'], ['p', 'extra57'], ['p', 'extra60'], ['q', 'ask-help'], ['p', 'extra62']] },
    { id: 'sleep', title: 'Спокойный вечер', steps: [['p', 'extra37'], ['p', 'extra33'], ['p', 'extra32']] }
  ];
  const QT = { 'boss-feedback': 'Разговор с начальником', 'refuse-colleague': 'Сказать «нет» коллеге', 'mom-boundaries': 'Разговор с мамой о границах', 'apology-friend': 'Извиниться и починить', 'ask-help': 'Попросить о помощи', 'money-talk': 'Разговор о деньгах', 'partner-needs': 'Сказать, что тебе нужно', 'say-no-friend': 'Отказать другу' };
  function renderNow() {
    const lib = $('#library'); if (!lib) return;
    let box = $('#nowBox'); if (!box) { box = h('section', 'now-box'); box.id = 'nowBox'; const tb = lib.querySelector('.catalog-toolbar'); if (tb) tb.before(box); else lib.append(box); }
    box.replaceChildren();
    const n = suggestNow();
    box.append(h('span', 'eyebrow', 'Подходит сейчас'), h('p', 'now-why', 'Подобрано ' + n.why + '. Можно выбрать любое или ничего.'));
    const grid = h('div', 'now-grid');
    n.items.forEach(([k, p]) => { const c = h('div', 'card practice'); c.append(h('small', 'practice-topic', (practiceTopics && practiceTopics[p.topic]) || ''), h('h3', null, p.title), h('p', null, p.desc)); const b = h('button', 'linkbtn', p.duration + ' · Открыть →'); b.onclick = () => openPractice(k); c.append(b); grid.append(c); });
    box.append(grid);
    const done = readC();
    box.append(h('h3', 'chain-h', 'Маршруты: несколько шагов подряд'));
    const cg = h('div', 'chain-grid');
    CHAINS.forEach(ch => {
      const d = done[ch.id] || [];
      const det = h('details', 'chain'); const sum = h('summary'); sum.append(h('b', null, ch.title), h('small', null, d.length + ' из ' + ch.steps.length)); det.append(sum);
      const ol = h('ol');
      ch.steps.forEach(([t, id], i) => {
        const li = h('li', d.includes(i) ? 'done' : '');
        const name = t === 'p' ? ((practices[id] || {}).title || id) : (QT[id] || id);
        const open = h('button', 'chain-open'); open.type = 'button'; open.append(h('span', 'chain-tag', t === 'p' ? 'практика' : 'тренажёр'), document.createTextNode(' ' + name));
        open.onclick = () => { if (t === 'p') openPractice(id); else { view('games'); setTimeout(() => window.RyadomQuest && window.RyadomQuest.open(id), 80); } };
        const chk = h('button', 'chain-chk', d.includes(i) ? '✓ Сделано' : 'Отметить'); chk.type = 'button'; chk.setAttribute('aria-pressed', d.includes(i) ? 'true' : 'false');
        chk.onclick = () => { const x = readC(); const a = x[ch.id] || []; x[ch.id] = a.includes(i) ? a.filter(v => v !== i) : a.concat(i); writeC(x); renderNow(); const again = $('#nowBox details:nth-of-type(' + (CHAINS.indexOf(ch) + 1) + ')'); if (again) again.open = true; };
        li.append(open, chk); ol.append(li);
      });
      det.append(ol); cg.append(det);
    });
    box.append(cg);
  }

  /* ---------- «Моя активность» в «Обо мне» ---------- */
  const NAMES = { chat: 'Сообщений в разговоре', practice: 'Практик открыто', quest_start: 'Тренажёров начато', quest_done: 'Тренажёров пройдено', 'view:library': 'Открытий «Практик»', 'view:games': 'Открытий «Игр»', 'view:places': 'Открытий «Мест»', 'view:history': 'Открытий дневника' };
  function renderStats() {
    const sec = $('#profile'); if (!sec) return;
    let box = $('#statBox'); if (!box) { box = h('div', 'card stat-box'); box.id = 'statBox'; sec.append(box); }
    box.replaceChildren(h('h3', null, 'Моя активность за 7 дней'), h('p', 'stat-note', 'Считается только в этом браузере и никуда не отправляется. Помогает понять, чем ты пользуешься.'));
    const { days, t } = totals(7);
    const ul = h('ul', 'stat-list');
    Object.keys(NAMES).forEach(k => { if (t[k]) ul.append(h('li', null, NAMES[k] + ': ' + t[k])); });
    if (!ul.children.length) ul.append(h('li', null, 'Пока нет данных.'));
    const row = h('div', 'stat-row');
    const cp = h('button', 'linkbtn', 'Скопировать сводку'); cp.type = 'button';
    cp.onclick = () => { const txt = 'Рядом: активность за ' + days + ' дн.\n' + Object.keys(NAMES).filter(k => t[k]).map(k => NAMES[k] + ': ' + t[k]).join('\n'); try { navigator.clipboard.writeText(txt).then(() => { cp.textContent = 'Скопировано'; }, () => { cp.textContent = 'Не удалось'; }); } catch { cp.textContent = 'Не удалось'; } };
    const rs = h('button', 'linkbtn', 'Сбросить счётчики'); rs.type = 'button'; rs.onclick = () => { window.RyadomStats.reset(); renderStats(); };
    row.append(cp, rs); box.append(ul, row);
  }

  /* ---------- «Места»: свои места и вкусы (работает без интернета) ---------- */
  const MINE_CATS = [['food', 'Еда'], ['place', 'Место'], ['spend', 'Занятие']];
  function renderMine() {
    const sec = $('#places'); const P = window.RyadomProfile; if (!sec || !P) return;
    let box = $('#mineBox'); if (!box) { box = h('section', 'mine-box'); box.id = 'mineBox'; const res = $('#placesResults'); if (res) res.after(box); else sec.append(box); }
    box.replaceChildren(h('h2', null, 'Моё: что я люблю'), h('p', 'now-why', 'Работает без интернета. Если поиск мест недоступен, подсказки берутся отсюда и из раздела «Обо мне».'));
    const st = P._get();
    if (!st.use) { box.append(h('p', 'stat-note', 'Запись о тебе сейчас выключена. Включить её можно в разделе «Обо мне».')); return; }
    const ideas = P.ideas();
    if (ideas) {
      const parts = [];
      if (ideas.food.length) parts.push('поесть — ' + ideas.food.join(' или '));
      const be = [].concat(ideas.place, ideas.spend); if (be.length) parts.push('побыть — ' + be.join(' или '));
      if (parts.length) box.append(h('p', 'mine-idea', 'Идея на сегодня: ' + parts.join('; ') + (ideas.avoid.length ? '. Лучше без: ' + ideas.avoid.join(', ') : '') + '.'));
    }
    const wrap = h('div', 'mine-list');
    st.items.filter(i => MINE_CATS.some(c => c[0] === i.cat)).forEach(i => {
      const chip = h('span', 'mine-chip'); chip.append(h('i', null, (MINE_CATS.find(c => c[0] === i.cat) || [])[1] || ''), document.createTextNode(' ' + i.text + ' '));
      const x = h('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', 'Убрать «' + i.text + '»'); x.onclick = () => { P.remove(i.id); renderMine(); };
      chip.append(x); wrap.append(chip);
    });
    if (!wrap.children.length) wrap.append(h('p', 'stat-note', 'Пока пусто. Добавь любимое место, блюдо или занятие: подсказки станут точнее.'));
    box.append(wrap);
    const f = h('form', 'mine-form'); const sel = h('select'); sel.setAttribute('aria-label', 'Что добавить');
    MINE_CATS.forEach(c => { const o = h('option', null, c[1]); o.value = c[0]; sel.append(o); });
    const inp = h('input'); inp.type = 'text'; inp.maxLength = 80; inp.placeholder = 'например: кофейня у реки'; inp.setAttribute('aria-label', 'Название или описание');
    const btn = h('button', 'linkbtn', 'Добавить'); btn.type = 'submit'; const msg = h('span', 'stat-note', '');
    f.onsubmit = e => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; const ok = P.add(sel.value, t, 'me'); if (ok) renderMine(); else msg.textContent = 'Такая запись уже есть или список полон.'; };
    f.append(sel, inp, btn, msg); box.append(f);
  }
  function init() { startRow(); renderNow(); renderStats(); renderMine(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
