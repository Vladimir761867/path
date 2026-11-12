/* Сервер ИИ (server/server.js) против имитации API Anthropic, которая проверяет формат запросов
 * так же строго, как настоящий API: заголовки, модель, чередование ролей, схему инструмента.
 * Проверяется: ответ модели, риск по правилам без вызова модели, риск от модели, откат на правила
 * при сбое и при недопустимом ответе, ограничение частоты, отсутствие текстов в логах, работа страницы.
 * Запуск: node tests/server-e2e.js (свободные порты 9913 и 8791). Настоящий API: server/check-live.js. */
const http = require('http'), { spawn } = require('child_process'), path = require('path');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const SECRET = 'секретная-фраза-' + Date.now();
let calls = 0, mode = 'ok', lastErr = '';

function invalid(rq, j) {
  if (rq.headers['x-api-key'] !== 'test-key') return 'x-api-key';
  if (rq.headers['anthropic-version'] !== '2023-06-01') return 'anthropic-version';
  if (!j.model || typeof j.model !== 'string') return 'model';
  if (!(j.max_tokens > 0)) return 'max_tokens';
  if (!Array.isArray(j.messages) || !j.messages.length) return 'messages пустые';
  if (j.messages[0].role !== 'user') return 'первое сообщение не от user';
  for (let i = 0; i < j.messages.length; i++) {
    const m = j.messages[i];
    if (!['user', 'assistant'].includes(m.role)) return 'роль ' + m.role;
    if (i && j.messages[i - 1].role === m.role) return 'роли не чередуются';
    const c = m.content; if (!(typeof c === 'string' ? c.trim() : Array.isArray(c) && c.length)) return 'пустой content';
  }
  if (!Array.isArray(j.tools) || !j.tools[0] || !j.tools[0].input_schema || j.tools[0].input_schema.type !== 'object') return 'tools';
  if (!j.tool_choice || j.tool_choice.type !== 'tool' || j.tool_choice.name !== j.tools[0].name) return 'tool_choice';
  return '';
}
const mock = http.createServer((rq, rs) => {
  let b = ''; rq.on('data', c => b += c); rq.on('end', () => {
    calls++; let j; try { j = JSON.parse(b); } catch { rs.writeHead(400); return rs.end('{}'); }
    const bad = invalid(rq, j); if (bad) { lastErr = bad; rs.writeHead(400, { 'content-type': 'application/json' }); return rs.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: bad } })); }
    if (mode === 'down') { rs.writeHead(529); return rs.end('{}'); }
    const t = j.tools[0].name, text = JSON.stringify(j.messages);
    let input;
    if (t === 'reply_in_role') input = { reply: 'Ладно, слушаю. Что конкретно хочется обсудить?', tone: 'calm', risk: 'none' };
    else if (t === 'give_review') input = { strengths: ['Просьба названа ясно'], suggestions: ['Добавь срок'], try_phrase: 'Давай договоримся на пятницу.' };
    else if (mode === 'diagnosis') input = { reply: 'Похоже, у тебя депрессия, принимай таблетки.', risk: 'none' };
    else if (/стою на краю/.test(text)) input = { reply: 'Мне очень важно, что ты пишешь. Ты сейчас в безопасности?', risk: 'self' };
    else input = { reply: 'Похоже, день вышел тяжёлым. Что сейчас ощущается сильнее всего?', question: 'Что было самым трудным?', risk: 'none' };
    rs.writeHead(200, { 'content-type': 'application/json' });
    rs.end(JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', content: [{ type: 'tool_use', id: 'tu_1', name: t, input }], stop_reason: 'tool_use' }));
  });
});
const post = (port, p, body) => new Promise((res, rej) => {
  const d = JSON.stringify(body); const rq = http.request({ host: '127.0.0.1', port, path: p, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(d) } }, r => { let s = ''; r.on('data', c => s += c); r.on('end', () => { try { res({ status: r.statusCode, json: JSON.parse(s || '{}') }); } catch (e) { res({ status: r.statusCode, json: {} }); } }); });
  rq.on('error', rej); rq.end(d);
});
function start(env, port) {
  const p = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], { env: Object.assign({}, process.env, { PORT: String(port) }, env), stdio: ['ignore', 'pipe', 'pipe'] });
  p.log = ''; p.stdout.on('data', d => p.log += d); p.stderr.on('data', d => p.log += d);
  return new Promise(r => setTimeout(() => r(p), 600));
}
const msgs = (...t) => t.map((text, i) => ({ role: i % 2 ? 'assistant' : 'user', text }));

(async () => {
  await new Promise(r => mock.listen(9913, r));
  // 1. Без ключа — сервер честно отдаёт откат на правила
  let s0 = await start({ ANTHROPIC_API_KEY: '' }, 8792);
  let r = await post(8792, '/api/dialogue', { messages: msgs('привет'), context: {} });
  ok(r.json.fallback === true, 'без ключа: fallback, клиент работает на правилах');
  s0.kill();

  const srv = await start({ ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9913' }, 8791);
  // 2. Обычный ответ: запрос прошёл строгую проверку формата
  r = await post(8791, '/api/dialogue', { messages: msgs('Сегодня был тяжёлый день на работе ' + SECRET), context: { practices: [{ id: 'breathe', title: 'Дыхание' }] } });
  ok(r.status === 200 && /тяжёлым/.test(r.json.reply || '') && r.json.risk === 'none', 'ответ модели доходит до клиента' + (lastErr ? ' (API отклонил: ' + lastErr + ')' : ''));
  // 3. Многоходовой разговор: роли чередуются, история не ломает запрос
  lastErr = '';
  r = await post(8791, '/api/dialogue', { messages: msgs('привет', 'Привет. Как ты?', 'устал от всего', 'Похоже, сил мало. Что тяжелее всего?', 'начальник'), context: {} });
  ok(r.status === 200 && r.json.reply && !lastErr, 'многоходовой разговор принимается API' + (lastErr ? ' → ' + lastErr : ''));
  // 4. Явный риск ловится правилами без обращения к модели
  const before = calls;
  r = await post(8791, '/api/dialogue', { messages: msgs('я хочу умереть'), context: {} });
  ok(r.json.risk === 'self' && calls === before, 'явный риск: ответ «self» без вызова модели');
  // 5. Риск, которого нет в правилах, приходит от модели
  r = await post(8791, '/api/dialogue', { messages: msgs('стою на краю крыши и смотрю вниз'), context: {} });
  ok(r.json.risk === 'self', 'риск, пропущенный правилами, модель помечает «self»');
  // 6. Недопустимый ответ модели (диагноз, лекарства) отбрасывается
  mode = 'diagnosis';
  r = await post(8791, '/api/dialogue', { messages: msgs('мне грустно'), context: {} });
  ok(r.json.fallback === true, 'ответ с диагнозом и лекарствами не показывается: fallback');
  // 7. Сбой провайдера → откат на правила, а не ошибка
  mode = 'down';
  r = await post(8791, '/api/dialogue', { messages: msgs('мне грустно'), context: {} });
  ok(r.status === 200 && r.json.fallback === true, 'сбой провайдера: fallback, приложение не падает');
  mode = 'ok';
  // 8. Репетиция разговора: роль и разбор
  r = await post(8791, '/api/rehearse', { persona: { name: 'Начальник', style: 'резкий', situation: 'перенос срока' }, messages: msgs('Мне нужно перенести срок'), mode: 'play' });
  ok(r.json.reply && r.json.risk === 'none', 'репетиция: реплика персонажа');
  r = await post(8791, '/api/rehearse', { persona: { name: 'Начальник', style: 'резкий', situation: 'перенос срока' }, messages: msgs('Мне нужно перенести срок', 'Почему?', 'Давай договоримся на пятницу'), mode: 'coach' });
  ok(Array.isArray(r.json.strengths) && r.json.strengths.length, 'репетиция: разбор');
  // 9. Слишком большой запрос и частота
  r = await post(8791, '/api/dialogue', { messages: msgs('а'.repeat(50000)), context: {} }).catch(() => ({ status: 413 }));
  ok(r.status === 413, 'слишком большой запрос отклоняется (413)');
  let limited = false; for (let i = 0; i < 25; i++) { const x = await post(8791, '/api/dialogue', { messages: msgs('привет ' + i), context: {} }); if (x.status === 429) { limited = true; break; } }
  ok(limited, 'ограничение частоты срабатывает (429)');
  // 10. Тексты разговоров не попадают в логи сервера
  ok(!srv.log.includes(SECRET) && !srv.log.includes('тяжёлый день'), 'сервер не пишет тексты в лог');
  srv.kill();

  // 11. Страница, отданная сервером с ключом, ходит в ИИ и показывает ответ
  const web = await start({ ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9913' }, 8793);
  try {
    const { chromium, devices } = require('playwright');
    const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' });
    await ctx.addInitScript(() => { try { localStorage.setItem('ryadom-consent-v1', 'x'); localStorage.setItem('ryadom-lang-v1', 'ru'); } catch (e) {} });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8793/index.html'); await p.waitForTimeout(600);
    ok(await p.evaluate(() => !!(window.RYADOM_API && window.RYADOM_API.url)), 'страница знает адрес сервера ИИ');
    const n0 = calls;
    await p.fill('#input', 'Сегодня всё валится из рук, ничего не успеваю'); await p.press('#input', 'Enter'); await p.waitForTimeout(1500);
    const txt = await p.$$eval('.messages .bubble:not(.me)', bs => bs.map(x => x.innerText).join(' '));
    ok(calls > n0, 'страница обращается к серверу ИИ');
    ok(/тяжёлым|ощущается/.test(txt), 'ответ модели показан в чате');
    ok(errs.length === 0, 'нет ошибок JS' + (errs.length ? ' → ' + errs[0] : ''));
    await b.close();
  } finally { web.kill(); }
  mock.close(); console.log(fail ? 'ошибок: ' + fail : 'всё совпало'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
