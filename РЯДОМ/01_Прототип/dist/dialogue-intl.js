/* Разговор на других языках (не русский).
 * Русский диалог (dialogue-v2.js) построен на разборе русской речи, поэтому для остальных языков — отдельный,
 * более простой поток: подсказки-кнопки + распознавание ключевых слов из словаря языка (lex в i18n/<код>.js).
 * Если подключён сервер с ИИ, свободный текст уходит туда, и ответ приходит на выбранном языке.
 * Безопасность: проверка риска (risk.js, все языки) идёт до всего остального; телефоны помощи — из help словаря.
 * Все фразы написаны по-русски и переводятся через RyadomI18n.t — один каталог на всё приложение. */
(function () {
  'use strict';
  const I = window.RyadomI18n;
  if (!I || I.lang === 'ru') return;
  const T = (s, v) => I.t(s, v);
  const lex = () => I.lex || {};
  const RISK = t => (window.RyadomRisk ? window.RyadomRisk.riskOf(t) : null);

  let st = fresh();
  function fresh() { return { phase: 'open', emo: null, theme: null, listen: 0, turns: [], usedListen: [] }; }
  const say = s => add(T(s));
  const sayRaw = s => add(s);
  const chips = list => choices(list.map(([l, v]) => [l, v]));

  /* ---------- распознавание по словарю ---------- */
  const fold = s => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}']+/gu, ' ').trim() + ' ';
  const raw = s => String(s || '').toLowerCase();
  const SUBSTR = /[\u0600-\u06ff\u3040-\u30ff\u3400-\u9fff]/;
  function has(text, words) {
    if (!words || !words.length) return false;
    const a = fold(text), b = raw(text);
    return words.some(w => {
      const f = fold(w).trim();
      if (!f) return false;
      // ja, zh (без пробелов) и арабский (слитные приставки) — поиск подстроки;
      // остальные — по началу слова; слово с пробелом на конце — только целиком
      if (SUBSTR.test(w)) return b.includes(String(w).toLowerCase().trim());
      return a.includes(' ' + f + (/\s$/.test(w) ? ' ' : ''));
    });
  }
  function detect(text) {
    const L = lex(), emo = L.emo || {}, th = L.theme || {}, it = L.intent || {};
    const out = { intent: null, emo: null, theme: null };
    for (const k of ['bye', 'thanks', 'doctor', 'who', 'hello', 'help', 'go', 'nowant']) if (has(text, it[k])) { out.intent = k; break; }
    let best = 0;
    for (const k of Object.keys(emo)) { const n = (emo[k] || []).filter(w => has(text, [w])).length; if (n > best) { best = n; out.emo = k; } }
    for (const k of Object.keys(th)) if (has(text, th[k])) { out.theme = k; break; }
    return out;
  }

  /* ---------- тексты ---------- */
  const EMO_REFLECT = {
    fear: 'Похоже, сейчас тревожно.', sad: 'Похоже, сейчас грустно.', anger: 'Похоже, сейчас много злости.',
    tired: 'Похоже, сил сейчас совсем немного.', lonely: 'Похоже, сейчас одиноко.', hurt: 'Похоже, это задело.',
    shame: 'Похоже, рядом с этим есть чувство вины или стыда.', good: 'Как хорошо это слышать!'
  };
  const THEME_LABEL = {
    work: 'Слышу, что это связано с работой.', family: 'Слышу, что это связано с семьёй.', love: 'Слышу, что это связано с отношениями.',
    friends: 'Слышу, что это связано с друзьями.', health: 'Слышу, что это связано со здоровьем.', money: 'Слышу, что это связано с деньгами.',
    study: 'Слышу, что это связано с учёбой.'
  };
  const MOOD_OF = { fear: 'anxious', sad: 'hard', anger: 'angry', tired: 'hard', lonely: 'hard', hurt: 'hard', shame: 'hard', good: 'good' };
  const TOPICS_OF = { fear: ['anxiety', 'stress'], sad: ['sadness', 'energy'], anger: ['anger', 'relations'], tired: ['energy', 'sleep'], lonely: ['relations', 'sadness'], hurt: ['relations', 'sadness'], shame: ['sadness', 'calm'], good: ['calm'] };
  const LISTEN = [
    'Я слушаю. Что было дальше?',
    'Это звучит непросто. Что сейчас ощущается сильнее всего?',
    'Понимаю. Что для тебя здесь самое важное?',
    'Спасибо, что рассказываешь. Как это на тебя повлияло?',
    'Если посмотреть на это со стороны — что хотелось бы изменить в первую очередь?',
    'Что помогло бы тебе хоть немного прямо сейчас?'
  ];
  const MOOD_CHIPS = [['Тревожно', 'emo:fear'], ['Грустно', 'emo:sad'], ['Злюсь', 'emo:anger'], ['Нет сил', 'emo:tired'], ['Одиноко', 'emo:lonely'], ['Всё хорошо', 'emo:good'], ['Куда сегодня сходить?', 'need:go']];
  const NEED_CHIPS = [['Просто выговориться', 'need:talk'], ['Небольшой шаг, чтобы стало легче', 'need:step'], ['Потренировать трудный разговор', 'need:prepare'], ['Куда сходить или что поесть', 'need:go']];

  /* ---------- шаги ---------- */
  function greet() {
    st = fresh();
    const box = document.querySelector('#messages'); if (box) box.replaceChildren();
    say('Привет. Я — «Рядом». Можно написать, как ты, своими словами или выбрать подсказку.');
    if (!remoteUrl()) say('На этом языке я понимаю простые фразы. Подсказки-кнопки помогут быть точнее.');
    chips(MOOD_CHIPS);
  }
  function recordMood(k) {
    const m = MOOD_OF[k]; if (!m) return;
    try { const arr = history(); arr.push({ day: todayKey(), mood: m }); save(arr.slice(-365)); } catch (e) { /* дневник недоступен */ }
  }
  function onEmotion(k, fromText) {
    st.emo = k; recordMood(k);
    if (k === 'good') {
      st.phase = 'good';
      say('Как хорошо это слышать! Что сегодня порадовало?');
      chips([['Куда сходить отметить?', 'need:go'], ['Записать в дневник', 'diary'], ['Есть и сложная часть', 'emo:other']]);
      return;
    }
    say(fromText && st.theme ? T(THEME_LABEL[st.theme]) + ' ' + T(EMO_REFLECT[k]) : EMO_REFLECT[k]);
    askNeed();
  }
  function askNeed() {
    st.phase = 'need';
    say('Что сейчас было бы полезнее?');
    chips(NEED_CHIPS);
  }
  function suggestPractices() {
    st.phase = 'step';
    const topics = TOPICS_OF[st.emo] || ['calm', 'stress'];
    const score = {}; try { history().filter(x => x.practice).forEach(x => { score[x.practice] = (score[x.practice] || 0) + (x.outcome === 'better' ? 2 : x.outcome === 'worse' ? -6 : 0); }); } catch (e) { /* нет истории */ }
    const list = Object.entries(practices).filter(([k]) => k !== 'flagship')
      .map(([k, p]) => [k, p, (topics.indexOf(p.topic) >= 0 ? 10 - topics.indexOf(p.topic) * 3 : 0) + (score[k] || 0) + (/^[12]\s*мин/.test(p.duration || '') ? 1 : 0) + Math.random()])
      .sort((a, b) => b[2] - a[2]).slice(0, 3);
    say('Вот что можно попробовать. Любой шаг можно остановить.');
    chips(list.map(([k, p]) => [T(p.title) + ' · ' + T(p.duration || ''), 'practice:' + k]).concat([['Лучше просто поговорим', 'need:talk']]));
  }
  function listenTurn(text) {
    st.listen++;
    const d = detect(text);
    if (d.emo && d.emo !== st.emo && d.emo !== 'good') { st.emo = d.emo; say(EMO_REFLECT[d.emo]); }
    const pool = LISTEN.filter(x => !st.usedListen.includes(x));
    const q = pool.length ? pool[Math.floor(Math.random() * pool.length)] : LISTEN[0];
    st.usedListen.push(q); if (st.usedListen.length >= LISTEN.length) st.usedListen = [];
    say(q);
    if (st.listen >= 3 && st.listen % 3 === 0) chips([['Подобрать небольшой шаг', 'need:step'], ['Продолжу рассказывать', 'more'], ['Пока достаточно', 'finish']]);
  }
  function finish() {
    st.phase = 'end';
    say('Спасибо за разговор. Я здесь, когда захочется вернуться.');
    chips([['Начать новый разговор', 'restart'], ['Открыть дневник', 'diary']]);
  }
  function safety(kind) {
    st.phase = 'safety';
    if (kind === 'others') say('Похоже, сейчас очень много злости. Если есть риск навредить другому человеку — остановись и выйди из ситуации: на воздух, в другую комнату. Если опасность рядом — звони в экстренную службу.');
    else if (kind === 'danger') say('То, что ты описываешь, звучит небезопасно. Твоя безопасность важнее всего. Если опасность рядом прямо сейчас — постарайся уйти в безопасное место и позвони в экстренную службу.');
    else say('Спасибо, что ты об этом говоришь. Твоя безопасность сейчас важнее всего. С этим не нужно справляться без поддержки: позвони на линию помощи или человеку, которому доверяешь.');
    helpLines();
    chips([['Показать текст для близкого', 'helptext'], ['Сейчас я в безопасности', 'safe']]);
  }
  function helpLines() {
    const h = I.help || {};
    const lines = [T('Если опасность прямо сейчас — экстренная служба: 112 (в большинстве стран).')];
    (h.lines || []).forEach(l => lines.push('• ' + l));
    lines.push(T('Линии помощи в других странах: findahelpline.com'));
    sayRaw(lines.join('\n'));
  }
  function remoteUrl() { return window.RYADOM_API && window.RYADOM_API.url ? window.RYADOM_API.url : null; }

  async function viaServer(text) {
    const url = remoteUrl(); if (!url) return false;
    st.turns.push({ role: 'user', text: String(text).slice(0, 1200) });
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const prof = window.RyadomProfile && window.RyadomProfile.forServer ? window.RyadomProfile.forServer() : null;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ messages: st.turns.slice(-12), context: { lang: I.lang, langName: I.name, practices: Object.keys(practices).map(k => ({ id: k, title: T(practices[k].title) })), profile: prof } }) });
      if (!res.ok) throw new Error('http');
      const r = await res.json();
      if (!r || r.fallback || typeof r.reply !== 'string') throw new Error('fallback');
      if (['self', 'others', 'danger'].includes(r.risk)) { safety(r.risk); return true; }
      const reply = r.reply.trim().slice(0, 900); if (!reply) throw new Error('empty');
      st.turns.push({ role: 'assistant', text: reply });
      sayRaw(reply);
      if (r.question && typeof r.question === 'string') sayRaw(r.question.trim().slice(0, 300));
      st.phase = 'listen';
      const pid = r.suggestedPracticeId;
      if (pid && practices[pid]) chips([[T(practices[pid].title), 'practice:' + pid], ['Продолжу рассказывать', 'more'], ['Пока достаточно', 'finish']]);
      return true;
    } catch (e) { st.turns.pop(); return false; } finally { clearTimeout(timer); }
  }

  function onText(text) {
    const risk = RISK(text);
    if (risk === 'self' || risk === 'others' || risk === 'danger') return safety(risk);
    const d = detect(text);
    if (d.theme) st.theme = d.theme;
    if (d.intent === 'bye') return finish();
    if (d.intent === 'thanks') { say('Пожалуйста. Я рядом.'); return chips([['Продолжу рассказывать', 'more'], ['Пока достаточно', 'finish']]); }
    if (d.intent === 'doctor') { say('Нет, я не врач и не психолог: не ставлю диагнозов и не лечу. Я помогаю выговориться, назвать, что происходит, и сделать небольшой шаг. Если тяжёлое состояние держится долго или мешает жить, стоит обратиться к специалисту.'); return chips(NEED_CHIPS); }
    if (d.intent === 'who') { say('Я «Рядом» — программа, а не человек. Я не врач и не заменяю специалиста.'); return chips(NEED_CHIPS); }
    if (d.intent === 'nowant') { say('Хорошо, не будем. Ничего объяснять не нужно. Можно просто побыть рядом или выбрать другое.'); return chips(NEED_CHIPS.concat([['Пока достаточно', 'finish']])); }
    if (d.intent === 'go') return goPlaces();
    if (d.intent === 'help') { say('Я рядом. Начнём с самого простого: что сейчас ближе?'); return chips(MOOD_CHIPS); }
    if (d.intent === 'hello' && !d.emo) { say('Привет. Что сейчас происходит? Можно написать своими словами или выбрать подсказку.'); return chips(MOOD_CHIPS); }
    // свободный текст: сначала сервер, если он есть
    if (remoteUrl()) {
      return viaServer(text).then(ok => { if (!ok) localTurn(text, d); });
    }
    return localTurn(text, d);
  }
  function localTurn(text, d) {
    if (st.phase === 'listen') return listenTurn(text);
    if (st.phase === 'good') { say('Это стоит запомнить. Хочешь отметить это — сходить куда-нибудь или записать в дневник?'); return chips([['Куда сходить отметить?', 'need:go'], ['Записать в дневник', 'diary'], ['Пока достаточно', 'finish']]); }
    if (d.emo) return onEmotion(d.emo, true);
    if (d.theme) { say(T(THEME_LABEL[d.theme]) + ' ' + T('А что здесь сильнее всего?')); return chips([['Тревога', 'emo:fear'], ['Злость', 'emo:anger'], ['Обида', 'emo:hurt'], ['Усталость', 'emo:tired'], ['Грусть', 'emo:sad'], ['Просто выговориться', 'need:talk']]); }
    if (st.phase === 'need' || st.phase === 'step' || st.phase === 'end') return listenTurn(text);
    say('Хочу понять точнее. Что ближе всего к тому, что сейчас внутри? Можно выбрать подсказку.');
    chips(MOOD_CHIPS);
  }
  function goPlaces() {
    const P = window.RyadomProfile;
    const id = P && P.ideas ? P.ideas() : null;
    const bits = id ? [].concat(id.place || [], id.spend || [], id.food || []).filter(Boolean) : [];
    if (bits.length) sayRaw(T('Из того, что известно о тебе:') + ' ' + bits.join(', ') + '.');
    say('В разделе «Места» можно выбрать настроение и посмотреть, что рядом.');
    chips([['Открыть «Места»', 'places'], ['Расскажу, что на душе', 'more']]);
  }

  function onCommand(v) {
    const [a, b] = v.split(':');
    switch (a) {
      case 'emo': if (b === 'other') { st.phase = 'open'; say('Расскажи, что ещё происходит.'); return; } return onEmotion(b, false);
      case 'need':
        if (b === 'talk') { st.phase = 'listen'; say('Я слушаю. Можно писать как получается — кусками, без порядка.'); return; }
        if (b === 'step') return suggestPractices();
        if (b === 'go') return goPlaces();
        if (b === 'prepare') { say('Тренажёры трудных разговоров пока доступны только на русском языке. Можно открыть их или выбрать другое.'); return chips([['Открыть тренажёры', 'games'], ['Небольшой шаг, чтобы стало легче', 'need:step'], ['Просто выговориться', 'need:talk']]); }
        return askNeed();
      case 'practice': return openPractice(b);
      case 'more': st.phase = 'listen'; say('Я слушаю.'); return;
      case 'finish': return finish();
      case 'restart': return greet();
      case 'diary': if (typeof view === 'function') view('history'); return;
      case 'places': if (typeof view === 'function') view('places'); return;
      case 'games': if (typeof view === 'function') view('games'); return;
      case 'safe': say('Хорошо. Если станет хуже — линии помощи выше, и можно вернуться сюда в любой момент.'); return chips([['Просто выговориться', 'need:talk'], ['Небольшой шаг, чтобы стало легче', 'need:step']]);
      case 'helptext': sayRaw(T('Можно отправить близкому:') + '\n«' + T('Мне сейчас очень тяжело. Пожалуйста, побудь со мной или позвони мне сейчас. Помоги обратиться за помощью.') + '»'); return chips([['Сейчас я в безопасности', 'safe']]);
      case 'better': case 'same': case 'worse': return afterPractice(a);
      default: return askNeed();
    }
  }
  function afterPractice(outcome) {
    try { const arr = history(); arr.push({ day: todayKey(), practice: (typeof state !== 'undefined' && state && state.currentPractice) || 'unknown', outcome }); save(arr.slice(-365)); } catch (e) { /* без истории */ }
    if (outcome === 'better') say('Хорошо, что стало хоть немного легче. Хочешь остановиться на этом или продолжить?');
    else if (outcome === 'worse') say('Жаль, что стало тяжелее. Давай не продолжать эту практику. Можно связаться с близким человеком или выбрать другой, более мягкий шаг.');
    else say('Иногда эффект приходит не сразу. Можно попробовать другой способ или просто поговорить.');
    chips([['Другой способ', 'need:step'], ['Просто выговориться', 'need:talk'], ['Пока достаточно', 'finish']]);
  }

  function respondIntl(label, value) {
    clearChoices();
    const chip = label !== value;
    add(chip ? T(label) : label, true);
    if (chip) return onCommand(String(value));
    return onText(String(label));
  }

  function boot() {
    try { pendingTranscript = []; activeDialogueId = null; } catch (e) { /* нет журнала */ }
    respond = respondIntl;
    askFeedback = function () { say('Как ты сейчас после этого шага?'); chips([['Чуть легче', 'better'], ['Пока так же', 'same'], ['Стало хуже', 'worse']]); };
    greet();
  }
  window.RyadomDialogueIntl = { detect, greet, onText };
  if (I.ready) boot(); else document.addEventListener('ryadom:i18n-ready', boot, { once: true });
})();
