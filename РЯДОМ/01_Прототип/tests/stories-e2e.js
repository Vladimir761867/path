/* Все сюжетные истории: каждая проходится до эпилога несколько раз со случайными выборами, без ошибок JS.
 * Нужен сервер на :4173 (python3 -m http.server 4173 в dist). SHOTS=1 — снимки сцен в /tmp/stories-shots. */
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/index.html';
const LANG = process.env.LANG_UI || 'ru';
const RUNS = Number(process.env.RUNS || 4);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: LANG === 'ru' ? 'ru-RU' : 'en-US' });
  await ctx.addInitScript(L => { try { localStorage.setItem('ryadom-lang-v1', L); localStorage.setItem('ryadom-consent-v1', 'x'); } catch (e) {} }, LANG);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(500);
  const ids = (process.env.IDS || '').split(',').filter(Boolean);
  const list = ids.length ? ids : await p.evaluate(() => Object.values(window.RyadomWorldStories || {}));
  for (const id of list) {
    for (let run = 0; run < RUNS; run++) {
      await p.evaluate(id => { try { Object.keys(localStorage).filter(k => k.startsWith('ryadom-story-v2-' + id)).forEach(k => localStorage.removeItem(k)); } catch (e) {} view('games'); window.RyadomStory.open(id); }, id);
      await p.waitForTimeout(250);
      let steps = 0, done = false, routes = new Set();
      while (steps++ < 80) {
        const st = await p.evaluate(run => {
          const q = s => [...document.querySelectorAll(s)].filter(x => x.offsetParent && !x.disabled);
          const r = Math.random;
          if (document.querySelector('.qc-epilogue')) return 'epilogue';
          const go = q('.qc-intro-screen .qc-next'); if (go.length) { go[0].click(); return 'intro'; }
          const objs = q('.qc-obj:not(.seen)'); if (objs.length && r() < 0.6) { objs[0].click(); return 'obj'; }
          const chs = q('.qc-choice'); if (chs.length) { chs[Math.floor(r() * chs.length)].click(); return 'choice'; }
          const nx = q('.qc-next'); if (nx.length) { nx[0].click(); return 'next'; }
          const acts = q('.qc-act'); if (acts.length) { acts[Math.floor(r() * acts.length)].click(); return 'act'; }
          return 'stuck';
        }, run);
        if (st === 'epilogue') { done = true; break; }
        if (st === 'stuck') break;
        await p.waitForTimeout(30);
      }
      if (process.env.SHOTS && run === 0) await p.screenshot({ path: `/tmp/stories-shots/${id}-epilogue.png`, fullPage: true });
      ok(done, `${id}: прохождение ${run + 1} дошло до эпилога за ${steps} шагов`);
    }
    if (process.env.SHOTS) {
      await p.evaluate(id => { Object.keys(localStorage).filter(k => k.startsWith('ryadom-story-v2-' + id)).forEach(k => localStorage.removeItem(k)); window.RyadomStory.open(id); }, id);
      await p.waitForTimeout(250); await p.click('.qc-intro-screen .qc-next'); await p.waitForTimeout(200);
      await p.screenshot({ path: `/tmp/stories-shots/${id}-opener.png`, fullPage: false });
    }
  }
  ok(errs.length === 0, 'нет ошибок JS' + (errs.length ? ' → ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fail ? 'ошибок: ' + fail : 'всё совпало'); process.exit(fail ? 1 : 0);
})();
