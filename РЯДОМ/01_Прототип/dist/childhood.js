/* Практика «Письмо себе из детства»: бережно вернуться к ситуации из детства, назвать чувства,
 * признать, что это было, сказать себе нужные слова и отпустить (или убрать в «контейнер»).
 * Опирается на: стабилизацию и безопасность прежде проработки (Herman, «Trauma and Recovery», 1992);
 * малые дозы — «не самое тяжёлое» (титрация); экспрессивное письмо без подробностей (Pennebaker);
 * радикальное принятие (Linehan, DBT, 1993/2015); сострадание к себе (Neff, 2011); технику «контейнер»
 * из стабилизирующих методик. Это самопомощь, не терапия: при тяжёлых воспоминаниях — работа со специалистом.
 * Написанное остаётся только на экране; в дневник уходит лишь факт практики и оценка до/после. */
(function () {
  'use strict';
  if (typeof practices === 'undefined' || typeof openPractice !== 'function') return;
  const T = s => (window.RyadomI18n ? window.RyadomI18n.t(s) : s);
  const KEY = 'childhood';
  practices[KEY] = { symbol: '◐', title: 'Письмо себе из детства', duration: '10–15 минут', desc: 'Вернуться к ситуации из детства, которая до сих пор отзывается: назвать чувства, признать, что это было, и отпустить.', text: 'Бережная практика о детском опыте. Без подробностей — только то, что чувствуется сейчас.', kind: 'guided', topic: 'past' };
  if (typeof practiceTopics !== 'undefined' && !practiceTopics.past) {
    practiceTopics.past = 'Детский опыт';
    const bar = document.querySelector('#practiceTopics');
    if (bar) {
      const b = document.createElement('button'); b.textContent = practiceTopics.past;
      b.onclick = () => { try { chosenTopic = 'past'; } catch (e) { /* старый каталог */ } bar.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); renderCatalog(); };
      bar.append(b);
    }
  }
  const prior = openPractice;
  openPractice = function (key) { if (key === KEY) return launch(); return prior(key); };
  if (typeof chooseSupport === 'function') {
    const priorChoose = chooseSupport;
    chooseSupport = function (mood, cause, need) {
      const list = priorChoose(mood, cause, need);
      if (/детств|в детстве|родител|когда был[аи]? маленьк|прошл|травм|отец|мать|отчим|мачех/i.test(cause || '') && need !== 'rest' && Array.isArray(list) && !list.some(x => x[1] === 'practice:' + KEY))
        list.unshift(['Письмо себе из детства · 10–15 минут', 'practice:' + KEY]);
      return list;
    };
  }
  if (typeof renderCatalog === 'function') renderCatalog();

  const FEEL = ['страх', 'стыд', 'одиночество', 'обида', 'злость', 'беспомощность', 'грусть', 'вина', 'растерянность', 'тревога'];
  const BODY = ['горло', 'грудь', 'живот', 'плечи и шея', 'руки', 'не чувствую в теле'];
  const NEEDS = ['защиты', 'утешения', 'чтобы выслушали', 'чтобы объяснили, что происходит', 'чтобы не винили', 'чтобы взрослый был рядом', 'чтобы заметили и похвалили', 'права на свои чувства'];
  const WORDS = ['Это не твоя вина.', 'Ты имеешь право чувствовать то, что чувствуешь.', 'Тебе досталось слишком много для такого возраста.', 'Я вижу, как тебе было трудно.', 'Теперь я рядом и могу о тебе позаботиться.', 'В твоём возрасте никто не справился бы лучше.'];
  const ACCEPT = ['Это было.', 'Это было больно.', 'В том возрасте нельзя было сделать больше.', 'Это закончилось. Сейчас я взрослый человек и я в безопасности.', 'Принять — не значит согласиться, что так было правильно.'];
  const STEPS = 7;

  const overlay = document.createElement('div'); overlay.className = 'focus-overlay child-overlay'; overlay.hidden = true;
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Практика «Письмо себе из детства»');
  document.body.append(overlay);
  let s = null, lastFocus = null;

  function launch() {
    lastFocus = document.activeElement;
    s = { step: 0, choice: '', before: -1, mid: -1, after: -1, age: '', line: '', feelings: [], body: [], needs: [], words: [], letter: '', release: '', stopped: false, done: false };
    overlay.hidden = false; document.body.classList.add('focus-open'); render();
    setTimeout(() => overlay.querySelector('h2')?.focus(), 30);
  }
  function close() { overlay.hidden = true; document.body.classList.remove('focus-open'); overlay.replaceChildren(); s = null; try { lastFocus && lastFocus.focus(); } catch (e) { /* */ } }
  function btn(label, fn, cls) { const b = document.createElement('button'); b.type = 'button'; b.className = cls || 'focus-button'; b.textContent = label; b.onclick = fn; return b; }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function chips(body, list, arr, multi) {
    const box = el('div', 'focus-options child-chips');
    list.forEach(v => box.append(btn(v, () => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { if (!multi) arr.length = 0; arr.push(v); } render(); }, 'focus-option' + (arr.includes(v) ? ' selected' : ''))));
    body.append(box);
  }
  function scale(body, field, low, high) {
    const row = el('div', 'focus-scale child-scale');
    for (let n = 0; n <= 10; n++) row.append(btn(String(n), () => { s[field] = n; render(); }, 'focus-scale-button' + (s[field] === n ? ' selected' : '')));
    body.append(row);
    const lab = el('div', 'focus-scale-labels'); lab.append(el('span', null, low), el('span', null, high)); body.append(lab);
  }
  function area(body, label, field, ph) {
    const l = el('label', 'child-field', label); const t = document.createElement('textarea'); t.value = s[field]; t.placeholder = ph || ''; t.maxLength = 1500; t.rows = 4;
    t.oninput = () => { s[field] = t.value; }; l.append(t); body.append(l);
  }
  function save(outcome) {
    try { const all = history(); all.push({ day: todayKey(), practice: KEY, outcome, at: new Date().toISOString() }); window.save ? window.save(all.slice(-365)) : localStorage.setItem('ryadom-history', JSON.stringify(all.slice(-365))); } catch (e) { /* дневник недоступен */ }
  }
  function stop(reason) { s.stopped = reason || true; s.done = true; save('worse'); render(); }

  function render() {
    if (!s) return;
    overlay.replaceChildren();
    const panel = el('div', 'focus-panel');
    const top = el('div', 'focus-top');
    top.append(el('span', 'focus-brand', '◐ РЯДОМ · ПРАКТИКА'), el('span', 'focus-progress-text', s.done ? 'Готово' : s.step === 0 ? 'Перед началом' : T('Шаг {0} из {1}', { 0: s.step, 1: STEPS })), btn('Закрыть', close, 'focus-close'));
    const prog = el('div', 'focus-progress'); const fill = el('span'); fill.style.width = (s.done ? 100 : Math.round(s.step / STEPS * 100)) + '%'; prog.append(fill);
    const body = el('div', 'focus-body'); const footer = el('div', 'focus-footer');
    panel.append(top, prog, body, footer);
    const head = (eyebrow, title, intro) => { body.append(el('span', 'focus-eyebrow', eyebrow)); const h = el('h2', null, title); h.tabIndex = -1; body.append(h); if (intro) body.append(el('p', 'focus-intro', intro)); };
    const next = (label, ok, hint) => footer.append(btn(label || 'Дальше →', () => { if (ok && !ok()) { if (hint) hint(); return; } s.step++; render(); overlay.querySelector('.focus-panel').scrollTop = 0; }, 'focus-main'));
    const back = () => footer.prepend(btn('← Назад', () => { s.step = Math.max(0, s.step - 1); render(); }, 'focus-back'));
    const pause = () => { const p = el('div', 'child-pause'); p.append(btn('Мне становится слишком тяжело', () => stop('heavy'), 'child-stop')); body.append(p); };

    if (s.done) {
      if (s.stopped) {
        head('ОСТАНОВКА — ЭТО ТОЖЕ ЗАБОТА', 'Остановиться — правильное решение', 'Заметить свой предел — важный навык, а не неудача. Вернись в «сейчас»: посмотри вокруг, назови пять предметов, медленно выдохни. Воспоминание никуда не денется — к нему можно вернуться позже, лучше вместе со специалистом.');
        const c = el('div', 'focus-callout', 'Если состояние не отпускает или появляются мысли навредить себе — открой экран помощи: там номера, текст для близкого и план безопасности.'); body.append(c);
        footer.append(btn('Открыть экран помощи', () => { close(); window.RyadomSOS && window.RyadomSOS.open(); }, 'focus-back'), btn('Вернуться в приложение', close, 'focus-main'));
      } else {
        head('ПРАКТИКА ЗАВЕРШЕНА', 'Встреча с собой из прошлого состоялась', 'Чувства могут отзываться ещё какое-то время — это нормально. Сегодня стоит сделать что-то тёплое и простое для себя: поесть, выйти на воздух, написать близкому человеку.');
        const d = s.after - s.before;
        body.append(el('p', 'focus-outcome', s.before < 0 || s.after < 0 ? 'Оценка не отмечена — это нормально.' : d < 0 ? 'Напряжение стало немного меньше.' : d > 0 ? 'Напряжение выросло. Позаботься о себе сегодня бережнее и, если это не проходит, обратись к специалисту или близкому.' : 'Напряжение не изменилось. Иногда эффект приходит позже — или нужен другой путь.'));
        body.append(el('div', 'focus-callout', 'Если это воспоминание часто возвращается, мешает спать, жить, строить отношения — это повод обратиться к психологу или психотерапевту, который работает с травмой. С ним можно пройти этот путь глубже и безопаснее.'));
        body.append(el('p', 'focus-privacy', 'В дневник сохранены только факт практики и изменение напряжения. Написанное тобой не сохранялось и исчезнет после закрытия.'));
        footer.append(btn('Вернуться в приложение', close, 'focus-main'));
      }
    } else if (s.step === 0) {
      head('ПЕРЕД НАЧАЛОМ', 'Бережно, в своём темпе', 'Мы вернёмся к ситуации из детства, которая до сих пор отзывается. Подробности вспоминать не нужно — важно то, что ты чувствуешь сейчас. Остановиться можно в любой момент.');
      body.append(el('h3', null, 'С каким воспоминанием хочется побыть?'));
      const ch = el('div', 'focus-options');
      [['light', 'Задевает, но с ним можно побыть 10 минут'], ['heavy', 'Очень тяжёлое: насилие, сильный страх, то, что накрывает']].forEach(([v, l]) => ch.append(btn(l, () => { s.choice = v; render(); }, 'focus-option' + (s.choice === v ? ' selected' : ''))));
      body.append(ch);
      if (s.choice === 'heavy') body.append(el('div', 'focus-callout', 'С очень тяжёлыми воспоминаниями самостоятельно лучше не работать: они могут накрыть сильнее, чем кажется. Эта практика подходит для чего-то полегче. С тяжёлым опытом бережнее и безопаснее идти к специалисту по травме. Можно выбрать другое, менее тяжёлое воспоминание — или просто закрыть практику.'));
      body.append(el('h3', null, 'Насколько тебе неспокойно прямо сейчас?'));
      scale(body, 'before', '0 — спокойно', '10 — очень тяжело');
      if (s.before >= 8) body.append(el('div', 'focus-callout', 'Сейчас напряжение очень высокое. Лучше сначала успокоиться: дыхание, прогулка, разговор с близким. К практике можно вернуться в другой день.'));
      body.append(el('p', 'focus-privacy', 'Если ты сейчас в опасности или ситуация из прошлого продолжается — сначала позаботься о безопасности: кнопка «Мне очень плохо» вверху экрана.'));
      footer.append(btn('Начать →', () => {
        if (s.choice !== 'light') { overlay.querySelector('.focus-options')?.scrollIntoView({ block: 'center' }); return; }
        if (s.before < 0) { overlay.querySelector('.child-scale')?.scrollIntoView({ block: 'center' }); return; }
        if (s.before >= 8) return stop('high');
        s.step = 1; render();
      }, 'focus-main'));
    } else if (s.step === 1) {
      head('01 · ОПОРА', 'Сначала — здесь и сейчас', 'Прежде чем идти в прошлое, найдём опору в настоящем. Посмотри вокруг и назови про себя три предмета. Почувствуй, как ты сидишь, как стопы касаются пола.');
      body.append(el('div', 'focus-orbit', 'вдох 4 · выдох 6'));
      body.append(el('p', 'focus-intro', 'Сделай три медленных выдоха — длиннее вдоха. Вспомни место, человека или вещь, рядом с которыми тебе спокойно. Это твоя опора: к ней можно вернуться в любой момент практики.'));
      back(); next('Опора есть →');
    } else if (s.step === 2) {
      head('02 · ТА СИТУАЦИЯ', 'Одной строкой, без подробностей', 'Сколько тебе было лет и что происходило — коротко, как заголовок. Не нужно пересказывать и прокручивать сцену. Можно ничего не писать, а просто держать её в уме.');
      area(body, 'Мне было примерно… (необязательно)', 'line', 'Например: «Мне 8, родители ругаются, а я сижу в своей комнате»');
      body.append(el('p', 'focus-privacy', 'Текст остаётся только на этом экране и не сохраняется.'));
      pause(); back(); next();
    } else if (s.step === 3) {
      head('03 · ЧУВСТВА', 'Какие чувства были тогда?', 'Отметь всё, что откликается. Чувства не бывают «неправильными» — тогда у них были причины.');
      chips(body, FEEL, s.feelings, true);
      body.append(el('h3', null, 'Где это отзывается в теле сейчас?'));
      chips(body, BODY, s.body, true);
      if (s.feelings.length) body.append(el('div', 'focus-callout', T('Тогда ребёнок чувствовал: {x}. Эти чувства были естественной реакцией на то, что происходило.', { x: s.feelings.map(T).join(', ') })));
      body.append(el('h3', null, 'Насколько тяжело сейчас?'));
      scale(body, 'mid', '0 — спокойно', '10 — очень тяжело');
      if (s.mid >= 8 || (s.before >= 0 && s.mid >= 0 && s.mid - s.before >= 4)) {
        body.append(el('div', 'focus-callout child-warn', 'Напряжение сильно выросло. Сейчас лучше остановиться и вернуться к опоре. Это правильное решение, а не слабость.'));
        footer.append(btn('Остановиться и вернуться к опоре', () => stop('heavy'), 'focus-main'));
        back(); return finish(panel);
      }
      pause(); back(); next('Дальше →', () => s.mid >= 0, () => overlay.querySelector('.child-scale')?.scrollIntoView({ block: 'center' }));
    } else if (s.step === 4) {
      head('04 · ЧЕГО НЕ ХВАТАЛО', 'Что тогда было нужно?', 'Каждому ребёнку нужны безопасность, утешение и взрослый рядом. Что было нужно тебе в той ситуации?');
      chips(body, NEEDS, s.needs, true);
      if (s.needs.length) body.append(el('div', 'focus-callout', T('Тебе тогда были нужны: {x}. Это нормальные потребности. То, что их не было, — не твоя вина: заботиться о ребёнке должны взрослые.', { x: s.needs.map(T).join(', ') })));
      pause(); back(); next();
    } else if (s.step === 5) {
      head('05 · ПРИЗНАТЬ', 'Это было', 'Принятие — не значит согласиться, что так было правильно, и не значит простить. Это значит перестать спорить с тем, что уже случилось, и забрать силы обратно в настоящее. Прочитай медленно, можно вслух:');
      const list = el('div', 'child-accept');
      ACCEPT.forEach(t => list.append(el('p', null, t)));
      body.append(list);
      body.append(el('p', 'focus-intro', 'Какая фраза отозвалась сильнее? Побудь с ней пару вдохов.'));
      pause(); back(); next();
    } else if (s.step === 6) {
      head('06 · СЛОВА СЕБЕ ТОГДА', 'Что ты скажешь тому ребёнку?', 'Представь себя в том возрасте. Сейчас ты взрослый человек и можешь сказать то, чего тогда никто не сказал. Выбери фразы или напиши своё письмо.');
      chips(body, WORDS, s.words, true);
      area(body, 'Моё письмо себе в детстве (необязательно)', 'letter', 'Привет. Я — это ты через много лет. Вот что мне хочется тебе сказать…');
      if (s.words.length) { const ph = el('div', 'focus-phrase'); ph.append(el('span', null, 'ТВОИ СЛОВА'), el('p', null, s.words.map(T).join(' '))); body.append(ph); }
      body.append(el('p', 'focus-privacy', 'Письмо никуда не отправляется и не сохраняется.'));
      pause(); back(); next();
    } else {
      head('07 · ОТПУСТИТЬ', 'Как ты хочешь завершить?', 'Отпустить — не значит забыть. Это значит перестать носить это с собой каждый день. Выбери, что подходит сейчас.');
      const opts = el('div', 'focus-action-grid');
      [['breath', 'Отпустить с выдохом', 'Три медленных выдоха. С каждым представь, что тяжесть выходит из тела.'], ['box', 'Убрать в контейнер', 'Представь прочную коробку. Положи туда это воспоминание и закрой. Оно будет там, пока ты не решишь вернуться к нему — например, со специалистом.'], ['erase', 'Стереть написанное', 'Если письмо написано — сотри его. Слова уже сказаны, им не нужно оставаться на экране.']].forEach(([k, t, d]) => {
        const b = btn('', () => { s.release = k; if (k === 'erase') { s.letter = ''; s.line = ''; } render(); }, 'focus-action' + (s.release === k ? ' selected' : ''));
        b.append(el('strong', null, t), el('small', null, d)); opts.append(b);
      });
      body.append(opts);
      if (s.release) {
        body.append(el('div', 'focus-callout', s.release === 'box' ? 'Коробка закрыта. Только тебе решать, когда её открыть.' : s.release === 'erase' ? 'Написанное стёрто. То, что важно, осталось с тобой.' : 'Сделай выдох длиннее вдоха. И ещё раз. И ещё.'));
        body.append(el('h3', null, 'Насколько неспокойно сейчас?'));
        scale(body, 'after', '0 — спокойно', '10 — очень тяжело');
      }
      back();
      footer.append(btn('Завершить', () => {
        if (!s.release) { overlay.querySelector('.focus-action-grid')?.scrollIntoView({ block: 'center' }); return; }
        if (s.after < 0) { overlay.querySelector('.child-scale')?.scrollIntoView({ block: 'center' }); return; }
        s.letter = ''; s.line = '';
        save(s.after < s.before ? 'better' : s.after > s.before ? 'worse' : 'same'); s.done = true; render(); overlay.querySelector('.focus-panel').scrollTop = 0;
      }, 'focus-main'));
    }
    finish(panel);
  }
  function finish(panel) { overlay.replaceChildren(panel); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });
  window.RyadomChildhood = { open: launch };
})();
