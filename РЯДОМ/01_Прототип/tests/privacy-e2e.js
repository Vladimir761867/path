/* Приватность: согласие при первом запуске, экспорт → удаление → импорт. Нужен сервер на :4173 (python3 -m http.server 4173 в dist). */
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/index.html';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(500);
  ok(!!(await p.$('.pv-overlay')), 'экран согласия показан при первом запуске');
  await p.screenshot({ path: '/tmp/claude-0/work/audit/consent.png' });
  await p.click('.pv-overlay .pv-btn'); await p.waitForTimeout(200);
  ok(!(await p.$('.pv-overlay')), 'после «Понятно» экран закрыт');
  await p.reload(); await p.waitForTimeout(400);
  ok(!(await p.$('.pv-overlay')), 'повторно не показывается');
  // данные
  await p.evaluate(() => { localStorage.setItem('ryadom-history', JSON.stringify([{ day: '2026-11-10', mood: 'good' }])); localStorage.setItem('ryadom-profile-v1', JSON.stringify({ version: 1, use: true, items: [{ cat: 'food', text: 'плов', src: 'me' }] })); });
  await p.evaluate(() => view('profile')); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(400); await p.evaluate(() => view('profile')); await p.waitForTimeout(300);
  ok(!!(await p.$('#privacyCard')), 'раздел «Данные и конфиденциальность» есть в «Обо мне»');
  const rows = await p.$$eval('#privacyCard .pv-list li', l => l.map(x => x.innerText.replace(/\s+/g, ' ')));
  ok(rows.some(r => /Дневник настроения/.test(r)), 'виден список хранимого: ' + rows.join('; '));
  await (await p.$('#privacyCard')).scrollIntoViewIfNeeded(); await p.screenshot({ path: '/tmp/claude-0/work/audit/privacy.png' });
  const json = await p.evaluate(() => window.RyadomPrivacy.exportJson());
  ok(JSON.parse(json).data['ryadom-history'], 'экспорт содержит дневник');
  // удаление (двухшаговое)
  await p.click('#privacyCard .pv-btn.danger'); await p.waitForTimeout(150);
  ok(!!(await p.$('text=Да, удалить всё')), 'требуется подтверждение удаления');
  await p.click('text=Да, удалить всё'); await p.waitForTimeout(1500);
  const left = await p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('ryadom-') === 0 && k !== 'ryadom-consent-v1'));
  ok(left.length === 0, 'после удаления ключей нет: ' + JSON.stringify(left));
  // импорт
  const r = await p.evaluate(j => window.RyadomPrivacy.importJson(j), json);
  ok(r.ok && await p.evaluate(() => !!localStorage.getItem('ryadom-history')), 'импорт восстановил данные');
  const bad = await p.evaluate(() => window.RyadomPrivacy.importJson('{"x":1}'));
  ok(!bad.ok, 'чужой файл отклонён');
  const evil = await p.evaluate(() => { const r = window.RyadomPrivacy.importJson(JSON.stringify({ app: 'ryadom', data: { 'other-key': 'x', 'ryadom-ok': 'y' } })); return [r.n, localStorage.getItem('other-key')]; });
  ok(evil[0] === 1 && evil[1] === null, 'импорт пишет только ключи ryadom-*');
  ok(errs.length === 0, 'нет ошибок JS ' + errs.join(';'));
  await b.close(); process.exit(fail ? 1 : 0);
})();
