/* Регрессия диалога: ответы на частые реплики. Нужен сервер на :4173 (python3 -m http.server 4173 в dist). */
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/index.html';
const CASES = [
  ['привет', /Привет\. Я здесь/], ['ты врач?', /не врач и не психолог/], ['ты кто', /программа, а не человек/], ['что ты умеешь', /потренировать трудный разговор/],
  ['помоги', /112/], ['пока', /До встречи/], ['не знаю', /не всегда находятся слова/], ['расскажи анекдот', /С шутками у меня слабо/],
  ['сколько будет 2+2', /Тут я не помощник/], ['😢', /Эмодзи тоже считается/], ['ты меня слышишь?', /я здесь и читаю/], ['бесишь', /честная обратная связь/],
  ['не хочу про это', /не будем/], ['asdfgh', /Я здесь и читаю|Давай проще|Хочу понять точнее/], ['мне тяжело', /тяжел|тяжест/], ['меня уволили', /потеря работы/], ['нормально всё', /тоже состояние/], ['скучно', /скучно/], ['на работе завал, не успеваю ничего', /связано с работой. А что здесь сильнее/], ['болит голова и нет настроения', /со здоровьем/], ['сегодня просто плохой день', /тяжест/], ['начальник орёт на меня', /повысили голос/],
  ['мне нужно сказать нет коллеге', /сказать «нет»/], ['хочу умереть', /112/], ['ничего не хочу, всё бессмысленно', /думаешь о том, чтобы причинить себе вред/]
];
let fail = 0;
(async () => {
  const b = await chromium.launch();
  for (const [msg, re] of CASES) {
    const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'ru-RU' }); await ctx.addInitScript(() => { try { localStorage.setItem('ryadom-consent-v1', 'x'); } catch (e) {} });
    const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(300);
    const i = await p.$('#input'); await i.fill(msg); await i.press('Enter'); await p.waitForTimeout(600);
    const t = await p.$$eval('.bubble:not(.me)', bs => bs.map(x => x.innerText.replace(/\s+/g, ' ')).join(' | '));
    const good = re.test(t); if (!good) fail++; console.log((good ? 'ok   ' : 'FAIL ') + msg + (good ? '' : ' → ' + t.slice(-160)));
    await ctx.close();
  }
  // переход к квесту после подтверждения
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); await ctx.addInitScript(() => { try { localStorage.setItem('ryadom-consent-v1', 'x'); } catch (e) {} });
  const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(300);
  const i = await p.$('#input'); await i.fill('начальник орёт на меня при всех'); await i.press('Enter'); await p.waitForTimeout(500);
  await p.click('.messages .choice:text-is("Да, примерно так")'); await p.waitForTimeout(500);
  const ok = await p.$('.messages .choice:text-is("Потренировать разговор")'); if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + 'после подтверждения предложен квест');
  await b.close(); process.exit(fail ? 1 : 0);
})();
