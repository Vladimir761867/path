/* Языки «Рядом».
 * Исходный текст приложения — русский. Для других языков словарь i18n/<код>.js сопоставляет русской строке перевод
 * (ключ — сама русская строка, как в gettext). Переводчик проходит по тексту страницы и атрибутам
 * (placeholder, aria-label, title, alt) и следит за изменениями, поэтому работает и для всего, что дорисовывается позже.
 * Числа и текст в «ёлочках» подставляются в шаблоны: «Найдено практик: {0} из {1}», «Удалить «{q}» из этого дня?».
 * Пользовательский текст (свои сообщения, заметки, названия мест) не трогается.
 * API: window.RyadomI18n = { lang, langs, t(ru, vars), setLang(code), locale, dir, ready, lex, help, missing } */
(function () {
  'use strict';
  const LANGS = [
    ['ru', 'Русский', 'ru-RU'], ['en', 'English', 'en-GB'], ['es', 'Español', 'es-ES'], ['fr', 'Français', 'fr-FR'],
    ['de', 'Deutsch', 'de-DE'], ['pt', 'Português', 'pt-PT'], ['tr', 'Türkçe', 'tr-TR'], ['kk', 'Қазақша', 'kk-KZ'],
    ['ka', 'ქართული', 'ka-GE'], ['ar', 'العربية', 'ar'], ['zh', '中文', 'zh-CN'], ['ja', '日本語', 'ja-JP'],
    ['ha', 'Hausa', 'ha-NG'], ['sw', 'Kiswahili', 'sw-KE'], ['yo', 'Yorùbá', 'yo-NG']
  ];
  const KEY = 'ryadom-lang-v1';
  const RTL = { ar: true };
  const codes = LANGS.map(l => l[0]);
  const safe = fn => { try { return fn(); } catch (e) { return undefined; } };

  function detect() {
    const saved = safe(() => localStorage.getItem(KEY));
    if (saved && codes.includes(saved)) return saved;
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ru']).map(x => String(x).toLowerCase());
    for (const l of list) { const c = l.split('-')[0]; if (codes.includes(c)) return c; if (['uk', 'be', 'ky', 'uz', 'tg', 'hy', 'az', 'ro'].includes(c)) return 'ru'; }
    return 'en';
  }
  const lang = detect();
  const meta = LANGS.find(l => l[0] === lang);
  const root = document.documentElement;
  root.lang = lang; root.dir = RTL[lang] ? 'rtl' : 'ltr';
  window.RYADOM_LOCALE = meta[2];

  const store = window.RYADOM_I18N = window.RYADOM_I18N || {};
  let dict = null, templates = [], ready = false;
  const outputs = new Set(); // готовые переводы на кириллице (казахский) — их не переводим повторно
  const missing = new Set();
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  const CYR = /[А-Яа-яЁё]/;

  function compile() {
    const d = (store[lang] && store[lang].strings) || {};
    dict = new Map();
    templates = [];
    Object.keys(d).forEach(k => {
      const nk = norm(k); dict.set(nk, d[k]); if (CYR.test(d[k]) && d[k] !== k) outputs.add(norm(d[k]));
      if (/\{[xyz]\}/.test(nk)) templates.push(toRe(nk));
    });
  }
  // Шаблон с {x}/{y}/{z} (любой текст), {0}… (числа), «{q}» (текст в кавычках) → регулярное выражение
  function toRe(key) {
    const names = [];
    const src = key.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{(x|y|z|q|\d+)\\?\}/g, (m, n) => {
      names.push(n);
      return /\d/.test(n) ? '(\\d+(?:[.,]\\d+)?)' : n === 'q' ? '([^«»]*?)' : '(.+?)';
    });
    return { key, names, re: new RegExp('^' + src + '$') };
  }
  // Перевод вставленного куска: целиком, иначе по частям через «; » и « — »
  function parts(x) {
    const d = lookup(x, true); if (d != null) return d;
    if (x.indexOf('; ') > 0) return x.split('; ').map(parts).join('; ');
    if (x.indexOf(' — ') > 0) return x.split(' — ').map(y => { const r = lookup(y, true); return r == null ? y : r; }).join(' — ');
    return x;
  }
  // Ключ-шаблон: числа → {0},{1}…, текст в «» → «{q}»
  function shape(s) {
    const nums = [], quotes = [];
    let k = s.replace(/«([^«»]*)»/g, (m, q) => { quotes.push(q); return '«{q}»'; });
    k = k.replace(/\d+(?:[.,]\d+)?/g, m => { nums.push(m); return '{' + (nums.length - 1) + '}'; });
    return { k, nums, quotes };
  }
  function fill(tr, nums, quotes) {
    let qi = 0;
    return tr.replace(/\{(\d+)\}/g, (m, i) => nums[+i] != null ? nums[+i] : m)
      .replace(/\{q\}/g, () => { const q = quotes[qi++]; return q == null ? '' : (lookup(q) || q); });
  }
  function lookup(s, noTemplates) {
    const n = norm(s);
    if (!n) return null;
    if (dict.has(n)) return dict.get(n);
    if (outputs.has(n)) return n;
    const sh = shape(n);
    if ((sh.nums.length || sh.quotes.length) && dict.has(sh.k)) return fill(dict.get(sh.k), sh.nums, sh.quotes);
    // число без шаблона: «12 мин», «Шаг 2 из 4» — пробуем только числа
    if (sh.nums.length && !sh.quotes.length) {
      const k2 = n.replace(/\d+(?:[.,]\d+)?/g, (() => { let i = 0; return () => '{' + (i++) + '}'; })());
      if (dict.has(k2)) return fill(dict.get(k2), sh.nums, []);
    }
    // только кавычки при неизменных числах
    if (sh.quotes.length) {
      const k3 = n.replace(/«([^«»]*)»/g, '«{q}»');
      if (dict.has(k3)) return fill(dict.get(k3), [], sh.quotes);
    }
    if (noTemplates) return null;
    for (const tp of templates) {
      const m = tp.re.exec(n); if (!m) continue;
      let out = dict.get(tp.key);
      tp.names.forEach((nm, i) => { const v = m[i + 1]; out = out.split('{' + nm + '}').join(/\d/.test(nm) ? v : parts(v)); });
      return out;
    }
    return null;
  }
  function t(ru, vars) {
    let out = ru;
    if (lang !== 'ru' && !dict && store[lang]) compile();
    if (lang !== 'ru' && dict) { const r = lookup(ru); if (r != null) out = r; else if (CYR.test(ru)) missing.add(norm(ru)); }
    if (vars) Object.keys(vars).forEach(k => { out = out.split('{' + k + '}').join(vars[k]); });
    return out;
  }

  /* ---------- перевод страницы ---------- */
  const SKIP = '[data-i18n-skip], .bubble.me, .archive-bubble.me, .detail-note, .prof-chips li > span, .mine-chip, .diary-place-info strong, .diary-place-memory, script, style, textarea, code, pre';
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  // Уже переведённое не трогаем повторно: перевод может совпадать с ключом (казахский — тоже кириллица)
  const doneText = new WeakMap(), doneAttr = new WeakMap();
  function trText(node) {
    const v = node.nodeValue;
    if (!v || !CYR.test(v) || doneText.get(node) === v) return;
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    const r = lookup(v);
    if (r == null) { missing.add(norm(v)); return; }
    const lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0];
    const out = lead + r + tail;
    doneText.set(node, out);
    if (out !== v) node.nodeValue = out;
  }
  function trAttrs(el) {
    if (el.closest && el.closest('[data-i18n-skip], .bubble.me')) return;
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (!v || !CYR.test(v)) continue;
      const seen = doneAttr.get(el); if (seen && seen[a] === v) continue;
      const r = lookup(v);
      if (r == null) { missing.add(norm(v)); continue; }
      doneAttr.set(el, Object.assign(seen || {}, { [a]: r }));
      if (r !== v) el.setAttribute(a, r);
    }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && CYR.test(el.value)) { const r = lookup(el.value); if (r != null) el.value = r; }
    if (el.tagName === 'OPTION' && CYR.test(el.textContent)) { /* текст опции — текстовый узел, переведётся сам */ }
  }
  function walk(rootNode) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) { trText(rootNode); return; }
    if (rootNode.nodeType !== 1) return;
    trAttrs(rootNode);
    const tw = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) trText(n); else trAttrs(n); }
  }
  function translatePage() {
    if (CYR.test(document.title)) { const r = lookup(document.title); if (r) document.title = r; }
    walk(document.body);
  }
  function observe() {
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') trText(m.target);
        else if (m.type === 'attributes') trAttrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* ---------- загрузка словаря ---------- */
  function finish() {
    if (ready) return; ready = true;
    root.classList.remove('i18n-loading');
    document.dispatchEvent(new CustomEvent('ryadom:i18n-ready', { detail: { lang } }));
  }
  function start() {
    if (lang === 'ru') { dict = new Map(); finish(); return; }
    root.classList.add('i18n-loading');
    const go = () => { compile(); translatePage(); observe(); finish(); };
    if (store[lang]) { onBody(go); return; }
    // Пока страница разбирается — грузим словарь синхронно, чтобы он был готов до скриптов приложения
    if (document.readyState === 'loading' && !window.RYADOM_I18N_ASYNC) {
      try {
        document.write('<script src="i18n/' + lang + '.js"><\/script>');
        onBody(() => { if (store[lang]) go(); else { dict = new Map(); finish(); } });
        return;
      } catch (e) { /* ниже — асинхронная загрузка */ }
    }
    const s = document.createElement('script');
    s.src = 'i18n/' + lang + '.js';
    s.onload = () => onBody(go);
    s.onerror = () => onBody(() => { dict = new Map(); finish(); });
    document.head.appendChild(s);
    setTimeout(() => { if (!ready) onBody(() => { compile(); translatePage(); observe(); finish(); }); }, 2500);
  }
  function onBody(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function setLang(code) {
    if (!codes.includes(code)) return;
    safe(() => localStorage.setItem(KEY, code));
    location.reload();
  }

  /* ---------- выбор языка ---------- */
  function picker(opts) {
    opts = opts || {};
    const wrap = document.createElement('label'); wrap.className = 'lang-pick' + (opts.compact ? ' compact' : ''); wrap.setAttribute('data-i18n-skip', '');
    const icon = document.createElement('span'); icon.className = 'lang-ico'; icon.textContent = '🌐'; icon.setAttribute('aria-hidden', 'true');
    const sel = document.createElement('select'); sel.setAttribute('aria-label', 'Language / Язык');
    LANGS.forEach(([c, name]) => { const o = document.createElement('option'); o.value = c; o.textContent = name; if (c === lang) o.selected = true; sel.append(o); });
    sel.onchange = () => setLang(sel.value);
    wrap.append(icon, sel);
    return wrap;
  }
  function mountPickers() {
    // в шапке рядом с датой
    const top = document.querySelector('.top > div');
    if (top && !document.getElementById('langTop')) { const p = picker({ compact: true }); p.id = 'langTop'; top.prepend(p); }
    // в «Обо мне»
    const sec = document.getElementById('profile');
    const put = () => {
      if (!sec || sec.querySelector('#langCard')) return;
      const card = document.createElement('div'); card.className = 'pv-card lang-card'; card.id = 'langCard';
      const h = document.createElement('h3'); h.textContent = t('Язык');
      const p = document.createElement('p'); p.textContent = t('Язык интерфейса, практик и разговора. Квесты и сюжетные игры пока на русском.');
      card.append(h, p, picker());
      sec.prepend(card);
    };
    if (sec) { put(); new MutationObserver(put).observe(sec, { childList: true }); }
    else setTimeout(mountPickers, 150);
  }
  onBody(() => setTimeout(mountPickers, 0));

  // Языки, на которые переведены квесты и сюжетные истории (папки quests/<код>/ и stories/<код>/)
  const CONTENT = ['ru', 'en'];
  const contentPath = (dir, id) => (lang !== 'ru' && CONTENT.includes(lang) ? dir + '/' + lang + '/' : dir + '/') + id + '.json';
  window.RyadomI18n = {
    content: CONTENT, contentPath, hasContent: () => CONTENT.includes(lang),
    lang, langs: LANGS, locale: meta[2], dir: root.dir, t, setLang, picker, missing,
    get ready() { return ready; },
    get lex() { return (store[lang] && store[lang].lex) || null; },
    get help() { return (store[lang] && store[lang].help) || null; },
    get name() { return meta[1]; },
    translate: walk
  };
  start();
})();
