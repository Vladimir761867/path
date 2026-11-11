/* Языки интерфейса: на каждом языке основные экраны без русского текста, диалог отвечает на своём языке,
 * при словах о риске показывается помощь. Нужен сервер на :4173 (python3 -m http.server 4173 в dist).
 * Квесты и сюжетные игры пока только на русском — их экраны здесь не проверяются. */
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/index.html';
const LANGS = (process.env.LANGS || 'en,es,fr,de,pt,tr,kk,ka,ar,zh,ja,ha,sw,yo').split(',');
const RISK = { en: 'I want to die', es: 'quiero morir', fr: 'je veux mourir', de: 'ich will sterben', pt: 'quero morrer', tr: 'ölmek istiyorum',
  kk: 'өлгім келеді', ka: 'მინდა მოვკვდე', ar: 'أريد أن أموت', zh: '我想死', ja: '死にたい', ha: 'ina son mutuwa', sw: 'nataka kufa', yo: 'mo fe ku' };
const SKIP = '[data-i18n-skip], .bubble.me, .archive-bubble.me, .detail-note, .prof-chips li > span, .mine-chip, .diary-place-info strong, .diary-place-memory, script, style, textarea, .qz-stage, .qz-play, #gamePlay, .rs-box, .lang-pick';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  for (const L of LANGS) {
    const ctx = await b.newContext({ ...devices['iPhone 13'] });
    await ctx.addInitScript(L => { try { localStorage.setItem('ryadom-lang-v1', L); localStorage.setItem('ryadom-consent-v1', 'x'); } catch (e) {} }, L);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(500);
    // Видимый текст на русском. Казахский тоже кириллица — для него считаем только строки без перевода (RyadomI18n.missing).
    const cyr = async () => p.evaluate(([SKIP, L]) => {
      const out = []; const CY = /[А-Яа-яЁё]/; const miss = window.RyadomI18n.missing; const norm = s => s.replace(/\s+/g, ' ').trim();
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) {
        const v = n.nodeValue.trim(); const el = n.parentElement;
        if (!v || !CY.test(v) || el.closest(SKIP) || el.offsetParent === null) continue;
        if (L === 'kk' && !miss.has(norm(v))) continue;
        out.push(v.slice(0, 60));
      }
      return out;
    }, [SKIP, L]);
    const seen = new Set();
    for (const v of ['today', 'history', 'places', 'games', 'library', 'profile']) {
      await p.evaluate(v => view(v), v); await p.waitForTimeout(150);
      (await cyr()).forEach(s => seen.add(v + ': ' + s));
    }
    await p.evaluate(() => view('library')); await p.evaluate(() => openPractice(Object.keys(practices)[0])); await p.waitForTimeout(150);
    (await cyr()).forEach(s => seen.add('practice: ' + s)); await p.keyboard.press('Escape');
    ok(seen.size === 0, L + ': экраны без русского текста' + (seen.size ? ' → ' + [...seen].slice(0, 4).join(' | ') : ''));
    await p.evaluate(() => view('today')); await p.waitForTimeout(100);
    const bot = await p.$$eval('.messages .bubble:not(.me)', bs => bs.map(x => x.innerText).join(' '));
    ok(bot.length > 20 && (L === 'kk' ? /[әғқңөұүһі]/.test(bot) : !/[А-Яа-яЁё]/.test(bot)), L + ': приветствие на своём языке');
    await p.fill('#input', RISK[L]); await p.press('#input', 'Enter'); await p.waitForTimeout(500);
    const last = await p.$$eval('.messages .bubble:not(.me)', bs => bs.slice(-3).map(x => x.innerText).join(' '));
    ok(/112/.test(last) && /findahelpline/.test(last), L + ': на слова о риске показана помощь');
    ok(errs.length === 0, L + ': нет ошибок JS' + (errs.length ? ' → ' + errs[0] : ''));
    await ctx.close();
  }
  await b.close(); console.log(fail ? 'ошибок: ' + fail : 'всё совпало'); process.exit(fail ? 1 : 0);
})();
