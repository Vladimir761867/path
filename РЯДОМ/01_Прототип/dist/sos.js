/* «Мне сейчас очень плохо»: кнопка на каждом экране и экран помощи.
 * Работает без распознавания текста — человек сам открывает помощь в любой момент.
 * План безопасности — по мотивам Safety Planning Intervention (Stanley & Brown, 2012); хранится только на устройстве. */
(function () {
  'use strict';
  const T = s => (window.RyadomI18n ? window.RyadomI18n.t(s) : s);
  const lang = () => (window.RyadomI18n ? window.RyadomI18n.lang : 'ru');
  const PLAN_KEY = 'ryadom-safety-plan-v1';
  // Россия: проверено по странице НИУ ВШЭ «Телефоны экстренной психологической помощи» (11.2026)
  const RU_LINES = [
    '8 800 2000-122 — телефон доверия для детей, подростков и родителей, круглосуточно',
    '8 495 989-50-50 — экстренная психологическая помощь для взрослых и детей, круглосуточно'
  ];
  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const safe = fn => { try { return fn(); } catch { return undefined; } };
  const loadPlan = () => safe(() => JSON.parse(localStorage.getItem(PLAN_KEY) || '{}')) || {};
  const savePlan = p => safe(() => localStorage.setItem(PLAN_KEY, JSON.stringify(p)));

  function lines() {
    const out = [T('Если опасность прямо сейчас — экстренная служба: 112 (в большинстве стран).')];
    if (lang() === 'ru') RU_LINES.forEach(l => out.push(l));
    else { const h = window.RyadomI18n && window.RyadomI18n.help; ((h && h.lines) || []).forEach(l => out.push(l)); }
    out.push(T('Линии помощи в других странах: findahelpline.com'));
    return out;
  }
  function phoneLink(text) {
    const m = String(text).match(/(\+?\d[\d\s()-]{1,16}\d)/);
    const li = $('li');
    if (!m) { li.textContent = text; return li; }
    const num = m[1].replace(/[^\d+]/g, '');
    const a = $('a', 'sos-tel', m[1]); a.href = 'tel:' + num;
    const i = text.indexOf(m[1]);
    li.append(document.createTextNode(text.slice(0, i)), a, document.createTextNode(text.slice(i + m[1].length)));
    return li;
  }

  let overlay = null, lastFocus = null;
  function close() { if (overlay) { overlay.remove(); overlay = null; if (lastFocus) safe(() => lastFocus.focus()); } }
  function open(section) {
    close(); lastFocus = document.activeElement;
    overlay = $('div', 'pv-overlay sos-overlay');
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'sosTitle');
    const sh = $('div', 'pv-sheet sos-sheet');
    const h = $('h2', null, T('Если сейчас очень тяжело')); h.id = 'sosTitle'; h.tabIndex = -1;
    sh.append(h, $('p', null, T('С этим не нужно справляться в одиночку. Выбери то, что получится сейчас.')));

    const call = $('section', 'sos-block');
    call.append($('h3', null, T('Позвонить')));
    const ul = $('ul', 'sos-lines'); ul.setAttribute('data-i18n-skip', ''); /* строки уже переведены */ lines().forEach(l => ul.append(phoneLink(l))); call.append(ul);
    sh.append(call);

    const msg = $('section', 'sos-block');
    msg.append($('h3', null, T('Написать близкому')));
    const text = T('Мне сейчас очень тяжело. Пожалуйста, позвони мне или побудь рядом. Помоги мне получить помощь.');
    const box = $('p', 'sos-msg', text); msg.append(box);
    const status = $('p', 'sos-status'); status.setAttribute('role', 'status');
    const row = $('div', 'sos-row');
    const copy = $('button', 'pv-btn ghost', T('Скопировать текст')); copy.type = 'button';
    copy.onclick = () => {
      const done = ok => { status.textContent = ok ? T('Скопировано.') : T('Скопируй текст вручную.'); if (!ok) safe(() => { const r = document.createRange(); r.selectNodeContents(box); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }); };
      safe(() => navigator.clipboard.writeText(text).then(() => done(true), () => done(false))) || (!navigator.clipboard && done(false));
    };
    row.append(copy);
    const share = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    if (share || navigator.share) {
      const s = $('button', 'pv-btn ghost', T('Отправить')); s.type = 'button';
      s.onclick = () => safe(() => (share ? share.share({ text }) : navigator.share({ text })).catch(() => {}));
      row.append(s);
    }
    msg.append(row, status); sh.append(msg);

    const calm = $('section', 'sos-block');
    calm.append($('h3', null, T('Пережить ближайшие минуты')));
    calm.append($('p', null, T('Медленный выдох длиннее вдоха. Назови пять вещей, которые видишь вокруг. Если рядом есть что-то опасное — отложи это подальше или выйди в другое место.')));
    if (typeof practices !== 'undefined' && practices.breathe && typeof openPractice === 'function') {
      const b = $('button', 'pv-btn ghost', T('Дыхание вместе со мной')); b.type = 'button';
      b.onclick = () => { close(); safe(() => { if (typeof view === 'function') view('library'); openPractice('breathe'); }); };
      calm.append(b);
    }
    sh.append(calm);

    const plan = $('section', 'sos-block'); plan.id = 'sosPlan';
    plan.append($('h3', null, T('Мой план безопасности')));
    plan.append($('p', null, T('Заполни, когда немного спокойнее. План останется только на этом устройстве и откроется здесь в трудную минуту.')));
    const P = loadPlan();
    [['signs', 'Как я понимаю, что мне становится хуже'], ['helps', 'Что помогает мне хоть немного'], ['people', 'Кому могу написать или позвонить'], ['safer', 'Как сделать обстановку вокруг безопаснее']].forEach(([k, label]) => {
      const l = $('label', 'sos-field', T(label)); const ta = $('textarea'); ta.maxLength = 400; ta.value = P[k] || ''; ta.rows = 2;
      ta.oninput = () => { const p = loadPlan(); p[k] = ta.value; p.updatedAt = new Date().toISOString(); savePlan(p); };
      l.append(ta); plan.append(l);
    });
    sh.append(plan);

    sh.append($('p', 'sos-note', T('«Рядом» — не экстренная служба и может не распознать, что тебе плохо. Если есть риск для жизни, звони 112 или обратись к человеку рядом.')));
    const ok = $('button', 'pv-btn', T('Закрыть')); ok.type = 'button'; ok.onclick = close; sh.append(ok);
    overlay.append(sh); document.body.append(overlay);
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    setTimeout(() => { safe(() => (section === 'plan' ? plan : h).scrollIntoView({ block: 'start' })); safe(() => h.focus({ preventScroll: section === 'plan' })); }, 30);
  }

  function mount() {
    const top = document.querySelector('.top > div'); if (!top || document.getElementById('sosBtn')) return;
    const b = $('button', 'sos-btn', T('Мне очень плохо')); b.type = 'button'; b.id = 'sosBtn';
    b.setAttribute('aria-label', T('Мне сейчас очень плохо — открыть помощь'));
    b.onclick = () => open();
    top.prepend(b);
  }
  window.RyadomSOS = { open, close, lines };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
