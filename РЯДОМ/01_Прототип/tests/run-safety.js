/* Прогон проверки риска на размеченных фразах: серверный предохранитель и клиентский riskOf.
 *   node tests/run-safety.js            (клиентская часть требует установленный playwright и работающий http-сервер на :4173) */
const cases = require('./safety-cases.json');
const { localRisk } = require('../server/server.js');
const norm = r => r || 'none';
let bad = 0;
console.log('— сервер —');
for (const c of cases) { const got = norm(localRisk(c.text)); if (got !== c.expect) { bad++; console.log('✗', JSON.stringify(c.text), 'ожидалось', c.expect, 'получено', got); } }
console.log(bad ? 'расхождений: ' + bad : 'сервер: всё совпало');
(async () => {
  let pw; try { pw = require('playwright'); } catch { console.log('клиент пропущен: нет playwright'); process.exit(bad ? 1 : 0); }
  const b = await pw.chromium.launch(), p = await b.newPage();
  await p.goto(process.env.APP_URL || 'http://localhost:4173/index.html');
  const res = await p.evaluate(cs => cs.map(c => window.RyadomDialogue.riskOf(c.text)), cases);
  let cb = 0; console.log('— клиент —');
  cases.forEach((c, i) => { const got = norm(res[i]); if (got !== c.expect) { cb++; console.log('✗', JSON.stringify(c.text), 'ожидалось', c.expect, 'получено', got); } });
  console.log(cb ? 'расхождений: ' + cb : 'клиент: всё совпало'); await b.close(); process.exit(bad + cb ? 1 : 0);
})();
