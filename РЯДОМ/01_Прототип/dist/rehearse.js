/* Свободная репетиция: модель играет собеседника, потом даёт короткий разбор. Доступна только при window.RYADOM_API.rehearse (есть сервер и ключ). */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const api = () => { const a = window.RYADOM_API; return a && a.rehearse && !a.disabled ? a.rehearse : null; };
  const SCEN = [
    { id: 'boss', title: 'Начальник дал неясную критику', name: 'Начальник', style: 'занятой, говорит коротко, быстро переходит к выводам, не любит долгих объяснений', situation: 'Начальник раскритиковал работу при коллегах и не объяснил, что именно не так. Человек хочет выяснить конкретные замечания и договориться о сроках.' },
    { id: 'colleague', title: 'Отказать коллеге', name: 'Коллега', style: 'напористый, умеет давить на жалость и торопить', situation: 'Коллега просит выйти вместо него в единственный выходной. Человек хочет вежливо отказать и не поссориться.' },
    { id: 'mom', title: 'Границы с мамой', name: 'Мама', style: 'тревожная, много советует, легко обижается', situation: 'Мама спрашивает про переезд и давит советами. Человек хочет сохранить близость и право решать самому.' },
    { id: 'apology', title: 'Извиниться перед другом', name: 'Друг', style: 'обижен, отвечает коротко и сдержанно, ждёт искренности', situation: 'Человек не пришёл на важное событие друга и не предупредил. Хочет извиниться и исправить.' },
    { id: 'money', title: 'Разговор о деньгах', name: 'Близкий человек', style: 'защищается, быстро слышит упрёк, при мягком тоне открывается', situation: 'Нужно обсудить неравные общие расходы и договориться о справедливом делении.' },
    { id: 'custom', title: 'Своя ситуация', name: '', style: '', situation: '' }
  ];
  let sc = null, msgs = [], busy = false;

  function root() { const r = $('#gamePlay'); $('#gamesHub').hidden = true; r.hidden = false; r.className = 'qz'; r.replaceChildren(); return r; }
  function back() { const r = $('#gamePlay'); r.hidden = true; r.replaceChildren(); $('#gamesHub').hidden = false; window.scrollTo(0, 0); }
  function top(r) { const t = h('div', 'qz-top'); const b = h('button', null, '← К играм'); b.type = 'button'; b.onclick = back; t.append(b, h('span', null, 'СВОБОДНАЯ РЕПЕТИЦИЯ')); r.append(t); }

  function pick() {
    const r = root(); top(r);
    const w = h('div', 'qz-intro'); w.append(h('span', 'qz-kicker', 'СВОБОДНАЯ РЕПЕТИЦИЯ'), h('h2', null, 'Репетиция с моделью'));
    w.append(h('p', null, 'Выбери ситуацию, и модель сыграет собеседника. Пиши свои реплики как в реальном разговоре. В конце можно получить короткий разбор формулировок.'));
    w.append(h('p', 'qz-note', 'Реплики отправляются на сервер помощника для ответа. Разговор не сохраняется в дневнике. Это учебная симуляция: реальный человек отреагирует иначе.'));
    const grid = h('div', 'qz-variants');
    SCEN.forEach(s => { const b = h('button', 'qz-variant'); b.type = 'button'; b.append(h('b', null, s.title), h('span', null, s.id === 'custom' ? 'Опиши, кто собеседник и что случилось.' : s.situation)); b.onclick = () => (s.id === 'custom' ? custom() : begin(Object.assign({}, s))); grid.append(b); });
    w.append(grid); r.append(w);
  }
  function custom() {
    const r = root(); top(r);
    const w = h('div', 'qz-intro'); w.append(h('h2', null, 'Своя ситуация'));
    const mk = (lab, id, ph, max) => { const l = h('label', null, lab); l.htmlFor = id; const i = h(id === 'rsSit' ? 'textarea' : 'input'); i.id = id; i.maxLength = max; i.placeholder = ph; if (id === 'rsSit') i.rows = 3; w.append(l, i); return i; };
    const who = mk('Кто собеседник?', 'rsWho', 'например: руководитель проекта', 40);
    const sty = mk('Какой он в разговоре?', 'rsSty', 'например: спешит, не любит возражений', 160);
    const sit = mk('Что случилось и чего ты хочешь добиться?', 'rsSit', 'коротко, без лишних подробностей', 300);
    const go = h('button', 'qz-next', 'Начать репетицию →'); go.type = 'button';
    go.onclick = () => { if (!who.value.trim() || !sit.value.trim()) return; begin({ id: 'custom', title: 'Своя ситуация', name: who.value.trim(), style: sty.value.trim(), situation: sit.value.trim() }); };
    w.append(go); r.append(w);
  }
  function begin(s) {
    if (window.RyadomStats) window.RyadomStats.hit('rehearse_start');
    sc = s; msgs = []; render();
  }

  function render(extra) {
    const r = root(); top(r);
    const w = h('div', 'rs-wrap');
    w.append(h('p', 'qz-note', 'Ситуация: ' + sc.situation));
    const log = h('div', 'rs-log'); log.setAttribute('aria-live', 'polite');
    if (!msgs.length) log.append(h('p', 'qz-narr', 'Начни разговор первой репликой. Собеседник ответит как «' + sc.name + '».'));
    msgs.forEach(m => { const b = h('div', 'qz-bubble ' + (m.role === 'user' ? 'you' : 'boss')); b.append(h('b', null, m.role === 'user' ? 'Ты' : sc.name), h('p', null, m.text)); log.append(b); });
    w.append(log);
    if (extra) w.append(extra);
    const f = h('form', 'rs-form'); const ta = h('textarea'); ta.rows = 2; ta.maxLength = 600; ta.placeholder = 'Твоя реплика'; ta.setAttribute('aria-label', 'Твоя реплика'); ta.disabled = busy;
    const send = h('button', 'qz-next', busy ? 'Ждём ответ…' : 'Сказать'); send.type = 'submit'; send.disabled = busy;
    f.onsubmit = e => { e.preventDefault(); const t = ta.value.trim(); if (t) say(t); };
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
    f.append(ta, send); w.append(f);
    const acts = h('div', 'qz-actions');
    if (msgs.filter(m => m.role === 'user').length >= 2) { const rv = h('button', 'qz-ghost', 'Получить разбор'); rv.type = 'button'; rv.disabled = busy; rv.onclick = review; acts.append(rv); }
    const again = h('button', 'qz-ghost', 'Другая ситуация'); again.type = 'button'; again.onclick = pick; acts.append(again);
    w.append(acts); r.append(w); const l = $('.rs-log'); if (l) l.scrollTop = l.scrollHeight; if (!busy) ta.focus({ preventScroll: true });
  }
  function note(text, actions) { const b = h('div', 'qz-feedback ok'); b.append(h('p', null, text)); (actions || []).forEach(a => b.append(a)); return b; }

  async function post(body) {
    const url = api(); if (!url) throw new Error('off');
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('http');
      const j = await res.json(); if (!j || j.fallback) throw new Error('fallback'); return j;
    } finally { clearTimeout(timer); }
  }
  function care() {
    return note('Похоже, ты пишешь о том, что может быть опасно для тебя или для другого человека. Репетицию останавливаю: твоя безопасность важнее. Если есть риск прямо сейчас, позвони по экстренному номеру 112 или позови человека рядом. В основном разговоре на вкладке «Сегодня» можно получить больше поддержки.');
  }
  function failNote() {
    const b = h('button', 'qz-ghost', 'К готовым тренажёрам'); b.type = 'button'; b.onclick = back;
    return note('Модель сейчас недоступна. Можно повторить через минуту или пройти готовый тренажёр: он работает без сервера.', [b]);
  }
  async function say(t) {
    const rk = window.RyadomRisk ? window.RyadomRisk.riskOf(t) : null;
    if (rk) return render(care());
    msgs.push({ role: 'user', text: t }); busy = true; render();
    try {
      const j = await post({ mode: 'play', persona: { name: sc.name, style: sc.style, situation: sc.situation }, messages: msgs.map(m => ({ role: m.role, text: m.text })) });
      busy = false;
      if (j.risk && j.risk !== 'none') { msgs.pop(); return render(care()); }
      msgs.push({ role: 'assistant', text: j.reply }); render();
    } catch { busy = false; msgs.pop(); render(failNote()); }
  }
  async function review() {
    busy = true; render(note('Готовлю разбор…'));
    try {
      const j = await post({ mode: 'coach', persona: { name: sc.name, style: sc.style, situation: sc.situation }, messages: msgs.map(m => ({ role: m.role, text: m.text })).concat([{ role: 'user', text: 'Разбери мои реплики.' }]) });
      busy = false;
      const box = h('div', 'qz-feedback good'); box.append(h('b', null, 'Разбор'));
      if (j.strengths && j.strengths.length) { box.append(h('p', null, 'Что получилось:')); const u = h('ul'); j.strengths.forEach(x => u.append(h('li', null, x))); box.append(u); }
      if (j.suggestions && j.suggestions.length) { box.append(h('p', null, 'Что можно попробовать:')); const u = h('ul'); j.suggestions.forEach(x => u.append(h('li', null, x))); box.append(u); }
      if (j.try_phrase) box.append(h('p', null, 'Вариант фразы: «' + j.try_phrase + '»'));
      render(box);
    } catch { busy = false; render(failNote()); }
  }
  window.RyadomRehearse = { available: () => !!api(), open: pick };
})();
