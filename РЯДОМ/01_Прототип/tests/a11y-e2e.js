/* Автоматическая проверка доступности (axe-core, правила WCAG 2.1 A/AA) на основных экранах и в истории,
 * плюс «слабый телефон»: процессор замедлен в 6 раз, сеть — медленный 4G.
 * Не заменяет проверку живым человеком с TalkBack/VoiceOver, но ловит то, что точно мешает экранному диктору.
 * Нужен axe-core: AXE=/путь/к/axe.min.js или npm i axe-core рядом. Сервер на :4173. */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const URL = process.env.URL || 'http://localhost:4173/index.html';
let axePath = process.env.AXE; try { axePath = axePath || require.resolve('axe-core/axe.min.js'); } catch (e) {}
if (!axePath || !fs.existsSync(axePath)) { console.log('axe-core не найден: npm i axe-core или AXE=путь'); process.exit(2); }
const AXE = fs.readFileSync(axePath, 'utf8');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 5'], locale: 'ru-RU' });
  await ctx.addInitScript(() => { try { localStorage.setItem('ryadom-consent-v1', 'x'); localStorage.setItem('ryadom-lang-v1', 'ru'); } catch (e) {} });
  const p = await ctx.newPage();
  const audit = async name => {
    await p.addScriptTag({ content: AXE });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations
      .filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id + ' ×' + v.nodes.length + ' (' + v.nodes[0].target.join(' ') + ')'));
    ok(r.length === 0, name + ': нет серьёзных нарушений' + (r.length ? ' → ' + r.slice(0, 4).join('; ') : ''));
  };
  await p.goto(URL); await p.waitForTimeout(500);
  for (const v of ['today', 'history', 'places', 'games', 'library', 'profile']) { await p.evaluate(v => view(v), v); await p.waitForTimeout(200); await audit('экран ' + v); }
  await p.evaluate(() => { view('games'); window.RyadomStory.open('trevoga'); }); await p.waitForTimeout(400);
  await p.click('.qc-intro-screen .qc-next'); await p.waitForTimeout(200); await audit('история «Тревога»');
  await p.click('#sosBtn'); await p.waitForTimeout(200); await audit('экран помощи');
  await p.keyboard.press('Escape');

  // Слабый телефон: замедленный процессор и сеть
  const slow = await ctx.newPage(); const cdp = await ctx.newCDPSession(slow);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  const t0 = Date.now(); await slow.goto(URL, { waitUntil: 'load' }); const load = Date.now() - t0;
  await slow.waitForSelector('.messages .bubble'); const ready = Date.now() - t0;
  ok(ready < 8000, `слабый телефон: первое сообщение через ${ready} мс (загрузка ${load} мс, порог 8 с)`);
  const t1 = Date.now(); await slow.evaluate(() => { view('games'); window.RyadomStory.open('poterya'); }); await slow.waitForSelector('.qc-intro-screen .qc-next'); await slow.click('.qc-intro-screen .qc-next'); await slow.waitForSelector('.qc-art');
  const st = Date.now() - t1; ok(st < 3000, `слабый телефон: история с иллюстрацией открылась за ${st} мс (порог 3 с)`);
  const t2 = Date.now(); await slow.evaluate(() => view('library')); await slow.waitForTimeout(50); const lib = Date.now() - t2;
  ok(lib < 1500, `слабый телефон: библиотека из 90 практик за ${lib} мс`);
  await b.close(); console.log(fail ? 'ошибок: ' + fail : 'всё совпало'); process.exit(fail ? 1 : 0);
})();
