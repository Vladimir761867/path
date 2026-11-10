/* «Обо мне» — профиль предпочтений. Всё хранится только в этом браузере и только то, что человек сам сказал,
 * добавил или подтвердил. Видно, откуда запись (сам / из разговора / из мест), любую запись можно удалить, весь профиль — стереть.
 * Использование в разговоре и подсказках можно выключить. API: window.RyadomProfile. */
(function () {
  'use strict';
  const KEY = 'ryadom-profile-v1';
  const CATS = [
    { k: 'food', title: 'Что люблю есть', hint: 'блюда, кухня, вкусы', ph: 'например: тёплый суп, кофе с булочкой' },
    { k: 'place', title: 'Где мне хорошо', hint: 'места и обстановка', ph: 'например: набережная, тихая библиотека' },
    { k: 'spend', title: 'Как люблю проводить время', hint: 'занятия и ритм', ph: 'например: долгая прогулка, кино вечером' },
    { k: 'help', title: 'Что помогает, когда тяжело', hint: 'то, что правда работает', ph: 'например: горячий чай, музыка в наушниках' },
    { k: 'people', title: 'С кем мне легко', hint: 'люди и формат общения', ph: 'например: с сестрой, один на один' },
    { k: 'avoid', title: 'Чего лучше избегать', hint: 'что выматывает или раздражает', ph: 'например: шумные места, спешка' }
  ];
  const SRC = { me: 'добавлено мной', chat: 'из разговора', places: 'из мест' };
  const LIMIT = 12;

  function read() { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && x.version === 1 && Array.isArray(x.items)) return x; } catch { /* пусто */ } return { version: 1, use: true, items: [] }; }
  let P = read();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* приватный режим */ } }
  const norm = t => String(t).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const clip = (t, n) => { t = String(t).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

  function add(cat, text, src) {
    if (!CATS.some(c => c.k === cat)) return false;
    text = clip(text, 80).replace(/^[«"'\s]+|[»"'\s.,;!?]+$/g, '');
    if (text.length < 2) return false;
    if (P.items.some(i => i.cat === cat && norm(i.text) === norm(text))) return false;
    if (P.items.filter(i => i.cat === cat).length >= LIMIT) return false;
    P.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cat, text, src: src || 'me', ts: new Date().toISOString().slice(0, 10) });
    save(); renderIfOpen(); return true;
  }
  function remove(id) { P.items = P.items.filter(i => i.id !== id); save(); renderIfOpen(); }
  function wipe() { P = { version: 1, use: P.use, items: [] }; save(); renderIfOpen(); }
  const list = cat => P.items.filter(i => i.cat === cat).map(i => i.text);
  const has = () => P.use && P.items.length > 0;
  function forServer() {
    if (!has()) return null;
    const o = {}; CATS.forEach(c => { const l = list(c.k).slice(0, 8); if (l.length) o[c.k] = l; }); return o;
  }

  /* ---------- распознавание в свободном тексте (только предложения; запоминается после согласия) ---------- */
  const FOOD = /(суп|борщ|пицц|кофе|чай|паст|суши|ролл|шоколад|плов|выпечк|булочк|пирог|блин|десерт|мороженн|салат|кухн|шашлык|рамен|бургер|сыр|фрукт|каш|яичниц|котлет|пельмен|вареник)/;
  const PLACE = /(парк|набережн|кафе|библиотек|музе|лес |лесу|река|реке|речк|море|морю|озер|двор|кинотеатр|сквер|книжн|горы|горах|пляж|сад |саду|площад|крыш)/;
  const POS = '(?:люблю|обожаю|нравится|нравятся|любимое|любимый|любимая)';
  const stop = s => s.split(/[.!?;\n]| но | а | потому | когда | если /)[0].replace(/^[\s:—-]+/, '').replace(/[\s,:—-]+$/, '').trim();
  function detect(text) {
    const out = [];
    const sentences = String(text).split(/(?<=[.!?\n])\s+/);
    sentences.forEach(sn => {
      const s = ' ' + sn.toLowerCase().replace(/ё/g, 'е') + ' ';
      const orig = sn;
      let m;
      if ((m = new RegExp(POS + '\\s+([^.!?;\\n]{3,70})').exec(s))) {
        const clause = stop(m[1]);
        if (FOOD.test(' ' + clause + ' ') && !/не /.test(s.slice(Math.max(0, m.index - 4), m.index + 1))) out.push({ cat: 'food', text: clause });
        else if (PLACE.test(' ' + clause + ' ')) out.push({ cat: 'place', text: clause });
      }
      if ((m = /(?:помогает|помогают|успокаивает|успокаивают|расслабляет)\s+([^.!?;\n]{3,70})/.exec(s))) { const c = stop(m[1]); if (c.length > 2) out.push({ cat: 'help', text: c }); }
      if ((m = /(?:не люблю|не переношу|бесит|раздражает|выматывает)\s+([^.!?;\n]{3,60})/.exec(s))) { const c = stop(m[1]); if (c.length > 2) out.push({ cat: 'avoid', text: c }); }
      if ((m = /(?:с (\S+) мне (?:легко|спокойно)|рядом с (\S+) (?:легко|спокойно))/.exec(s))) out.push({ cat: 'people', text: m[0].trim() });
      void orig;
    });
    return out.filter(c => !P.items.some(i => i.cat === c.cat && norm(i.text) === norm(c.text)));
  }

  /* ---------- подсказки «куда сходить / что поесть» из профиля ---------- */
  function favoriteNames() {
    try {
      const keys = typeof placeFavorites === 'function' ? placeFavorites() : [];
      const cat = typeof catalogPlaces === 'function' ? catalogPlaces() : [];
      return keys.map(k => { const c = cat.find(x => x.key === k); const n = c ? c.name : k.split('|')[0]; return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; }).filter(Boolean);
    } catch { return []; }
  }
  function importPlaces() {
    let n = 0;
    favoriteNames().slice(0, 6).forEach(nm => { if (add('place', nm, 'places')) n++; });
    try {
      const cnt = {};
      (typeof placeVisits === 'function' ? placeVisits() : []).forEach(v => { if (v && v.name) { const k = v.name.trim(); cnt[k] = (cnt[k] || 0) + 1; } });
      Object.entries(cnt).filter(([, c]) => c >= 2).slice(0, 4).forEach(([nm]) => { if (add('place', nm + ' (бываю часто)', 'places')) n++; });
    } catch { /* нет мест */ }
    return n;
  }
  function ideas() {
    if (!has()) return null;
    const pick = (k, n) => list(k).slice(-n);
    return { food: pick('food', 2), place: pick('place', 2), spend: pick('spend', 2), help: pick('help', 2), avoid: pick('avoid', 2), people: pick('people', 1) };
  }

  /* ---------- экран ---------- */
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  let section = null, note = '';
  function mount() {
    const lib = document.querySelector('#library'); if (!lib) return;
    section = $('section', 'section section-wide'); section.id = 'profile';
    lib.after(section);
    const mk = (parent, cls) => { const b = $('button'); b.type = 'button'; b.dataset.view = 'profile'; if (cls) b.className = cls; return b; };
    const nav = document.querySelector('aside .nav'); if (nav) { const b = mk(nav); b.innerHTML = '<span class="ico">♡</span>Обо мне'; nav.append(b); }
    const mn = document.querySelector('.mobile-nav'); if (mn) { const b = mk(mn); b.innerHTML = '<span>♡</span>Обо мне'; mn.append(b); mn.classList.add('has-profile'); }
    document.querySelectorAll('[data-view="profile"]').forEach(b => { b.onclick = () => { if (typeof view === 'function') view('profile'); render(); }; });
    document.querySelectorAll('[data-view="places"]').forEach(b => b.addEventListener('click', placesNote));
    render(); placesNote();
  }
  const isOpen = () => section && section.classList.contains('active');
  function renderIfOpen() { if (isOpen()) render(); placesNote(); }
  function render() {
    if (!section) return;
    section.replaceChildren();
    section.append($('span', 'eyebrow', 'Только то, что ты сам рассказал'), $('h1', 'page-title', 'Что обо мне известно'),
      $('p', 'lede', 'Чтобы «Рядом» мог подсказать, куда сходить, что поесть и что поможет, ему нужно знать тебя. Здесь видно всё, что он помнит. Записи остаются только в этом браузере: любую можно удалить.'));
    const row = $('div', 'prof-bar');
    const lab = $('label', 'prof-use'); const cb = $('input'); cb.type = 'checkbox'; cb.checked = P.use; cb.onchange = () => { P.use = cb.checked; save(); render(); };
    lab.append(cb, $('span', null, 'Использовать в разговоре и подсказках')); row.append(lab);
    const imp = $('button', 'prof-ghost', 'Подтянуть из любимых мест'); imp.type = 'button';
    imp.onclick = () => { const n = importPlaces(); note = n ? 'Добавлено записей: ' + n : 'Новых мест для добавления нет. Отметь любимые в разделе «Места» или посещения в дневнике.'; render(); };
    row.append(imp); section.append(row);
    if (note) { section.append($('p', 'prof-note', note)); note = ''; }
    if (!P.use) section.append($('p', 'prof-note', 'Сейчас записи не используются: ни в разговоре, ни в подсказках, ни на сервере.'));
    const grid = $('div', 'prof-grid');
    CATS.forEach(c => {
      const card = $('div', 'prof-card'); card.append($('h3', null, c.title), $('small', null, c.hint));
      const ul = $('ul', 'prof-chips'); const items = P.items.filter(i => i.cat === c.k);
      if (!items.length) ul.append($('li', 'empty', 'Пока пусто'));
      items.forEach(i => { const li = $('li'); li.append($('span', null, i.text), $('em', null, SRC[i.src] || '')); const x = $('button', null, '×'); x.type = 'button'; x.setAttribute('aria-label', 'Удалить: ' + i.text); x.onclick = () => remove(i.id); li.append(x); ul.append(li); });
      card.append(ul);
      const f = $('form', 'prof-add'); const inp = $('input'); inp.type = 'text'; inp.maxLength = 80; inp.placeholder = c.ph; inp.setAttribute('aria-label', c.title);
      const b = $('button', null, 'Добавить'); b.type = 'submit'; f.append(inp, b);
      f.onsubmit = e => { e.preventDefault(); if (add(c.k, inp.value, 'me')) render(); else inp.value = ''; };
      card.append(f); grid.append(card);
    });
    section.append(grid);
    const danger = $('div', 'prof-danger'); const w = $('button', 'prof-ghost', 'Стереть всё, что обо мне записано'); w.type = 'button';
    w.onclick = () => { danger.replaceChildren($('span', null, 'Удалить все записи профиля? Вернуть их будет нельзя. '), (() => { const y = $('button', 'prof-ghost', 'Да, стереть'); y.type = 'button'; y.onclick = () => { wipe(); }; return y; })(), (() => { const n = $('button', 'prof-ghost', 'Отмена'); n.type = 'button'; n.onclick = () => render(); return n; })()); };
    danger.append(w); section.append(danger, $('p', 'prof-note', 'Дневник, места и игровой прогресс — отдельные данные: их очистка здесь не затрагивается.'));
  }
  function placesNote() {
    const host = document.querySelector('#placesResults'); if (!host) return;
    let n = document.querySelector('#profilePlacesNote');
    if (!n) { n = $('div', 'prof-places'); n.id = 'profilePlacesNote'; host.before(n); }
    n.replaceChildren();
    const id = ideas(); if (!id) { n.hidden = true; return; }
    const bits = [].concat(id.place, id.spend, id.food).filter(Boolean);
    if (!bits.length) { n.hidden = true; return; }
    n.hidden = false;
    n.append($('b', null, 'Из «Обо мне»: '), document.createTextNode('тебе обычно подходит — ' + bits.join(', ') + (id.avoid.length ? '. Лучше без: ' + id.avoid.join(', ') : '') + '. Выбирай места с учётом этого.'));
  }

  window.RyadomProfile = { add, remove, list, has, forServer, detect, ideas, importPlaces, favoriteNames, cats: CATS, _get: () => P };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
