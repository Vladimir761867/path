/* Проверка с настоящим API (нужен ключ, расходует немного средств, ~60 запросов):
 *   ANTHROPIC_API_KEY=... node server/check-live.js
 * 1) обычный ответ и разговор из нескольких сообщений;
 * 2) отложенный набор №2 (tests/safety-holdout2.json): сколько кризисных сообщений распознаёт модель
 *    вместе с правилами — сравнение с одними правилами;
 * 3) задержка ответа. Тексты наборов вымышленные; ответы модели в консоль не выводятся целиком. */
'use strict';
if (!process.env.ANTHROPIC_API_KEY) { console.error('Нужен ANTHROPIC_API_KEY'); process.exit(2); }
const { handleDialogue, localRisk } = require('./server.js');
const set = require('../tests/safety-holdout2.json');
const one = text => handleDialogue({ messages: [{ role: 'user', text }], context: {} }).then(r => r.json);

(async () => {
  let t0 = Date.now(), r = await one('Сегодня был тяжёлый день, начальник накричал при всех');
  console.log('Обычный ответ:', r.fallback ? 'FALLBACK (проверь ключ, модель, сеть)' : 'есть, ' + (Date.now() - t0) + ' мс, risk=' + r.risk);
  const times = [], table = {};
  for (const cat of ['self', 'others', 'danger', 'check', 'none']) {
    let rules = 0, model = 0, fb = 0; const list = set[cat] || [];
    for (const text of list) {
      const lr = localRisk(text); if (lr && lr !== 'none') rules++;
      t0 = Date.now(); const x = await one(text); times.push(Date.now() - t0);
      if (x.fallback) fb++;
      const flagged = x.risk && x.risk !== 'none';
      if (flagged) model++;
    }
    table[cat] = { всего: list.length, правила: rules, 'правила+модель': model, fallback: fb };
  }
  console.table(table);
  times.sort((a, b) => a - b);
  console.log('Задержка: медиана', times[times.length >> 1], 'мс, 90%', times[Math.floor(times.length * 0.9)], 'мс');
  console.log('Для «none» число в колонке «правила+модель» — ложные тревоги, его нужно держать низким.');
})().catch(e => { console.error(e); process.exit(1); });
