/* Проверка native.js без телефона: подменяем Capacitor и плагины. Нужен сервер: (cd www && python3 -m http.server 4174) */
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4174/index.html';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const mock = () => {
  if (sessionStorage.getItem('__wipe')) { sessionStorage.removeItem('__wipe'); localStorage.clear(); }
  const store = JSON.parse(sessionStorage.getItem('__prefs') || '{}');
  const persist = () => sessionStorage.setItem('__prefs', JSON.stringify(store));
  const log = window.__log = []; const L = {};
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
    Preferences: { set: async ({ key, value }) => { store[key] = value; persist(); }, get: async ({ key }) => ({ value: store[key] || null }), remove: async ({ key }) => { delete store[key]; persist(); } },
    App: { addListener: (n, f) => { L[n] = f; return Promise.resolve(); }, minimizeApp: async () => log.push('minimize'), exitApp: async () => log.push('exit') },
    StatusBar: { setStyle: async () => log.push('statusbar'), setBackgroundColor: async () => {} },
    SplashScreen: { hide: async () => log.push('splash-hide') },
    Haptics: { impact: async () => log.push('haptic') },
    Filesystem: { writeFile: async ({ path, data }) => { log.push('write:' + path + ':' + data.length); return { uri: 'file:///cache/' + path }; } },
    Share: { share: async (o) => log.push('share:' + o.files[0]) },
    LocalNotifications: { cancel: async () => log.push('ln-cancel'), checkPermissions: async () => ({ display: 'prompt' }), requestPermissions: async () => ({ display: 'granted' }), schedule: async (o) => log.push('ln-schedule:' + JSON.stringify(o.notifications[0].schedule)), addListener: async () => {} }
  } };
  window.__back = () => L.backButton && L.backButton();
};
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'ru-RU' });
  await ctx.addInitScript(mock);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.documentElement.classList.contains('native-android')), 'класс native-android на странице');
  const log0 = await p.evaluate(() => window.__log.slice());
  ok(log0.includes('statusbar') && log0.includes('splash-hide'), 'статус-бар и заставка: ' + log0.join(','));
  ok(!(await p.evaluate(() => 'serviceWorker' in navigator && navigator.serviceWorker.controller)), 'без service worker');
  // согласие и бэкап
  await p.click('.pv-overlay .pv-btn'); await p.waitForTimeout(700);
  await p.evaluate(() => localStorage.setItem('ryadom-history', JSON.stringify([{ day: '2026-11-10', mood: 'good' }]))); await p.waitForTimeout(700);
  const backup = await p.evaluate(() => JSON.parse(sessionStorage.getItem('__prefs'))['ryadom-backup-v1']);
  ok(backup && /ryadom-history/.test(backup), 'данные продублированы в нативное хранилище');
  // потеря localStorage → восстановление
  await p.evaluate(() => sessionStorage.setItem('__wipe', '1'));
  await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!localStorage.getItem('ryadom-history')), 'после очистки WebView данные восстановлены из копии');
  // кнопка назад
  await p.evaluate(() => view('library')); await p.evaluate(() => window.__back()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelector('#today').classList.contains('active')), '«назад» из раздела → «Сегодня»');
  await p.evaluate(() => openPractice('breathe')); await p.waitForTimeout(200); await p.evaluate(() => window.__back()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.querySelector('#overlay').classList.contains('show')), '«назад» закрывает окно практики');
  await p.evaluate(() => window.__back()); await p.waitForTimeout(100);
  ok((await p.evaluate(() => window.__log)).includes('minimize'), '«назад» на главном экране сворачивает приложение');
  // тактильная отдача
  await p.click('.mobile-nav button >> nth=1'); await p.waitForTimeout(100);
  ok((await p.evaluate(() => window.__log)).includes('haptic'), 'тактильная отдача на кнопке ответа');
  // напоминание
  await p.evaluate(() => view('profile')); await p.waitForTimeout(300);
  ok(!!(await p.$('#reminderCard')), 'карточка «Напоминание» в «Обо мне»');
  await p.check('#reminderCard input[type=checkbox]'); await p.waitForTimeout(400);
  const lg = await p.evaluate(() => window.__log.join(' '));
  ok(/ln-schedule:\{"on":\{"hour":20,"minute":0\}/.test(lg), 'напоминание запланировано на 20:00');
  ok(/каждый день в 20:00/.test(await p.innerText('#reminderCard')), 'показан результат включения');
  await (await p.$('#reminderCard')).screenshot({ path: '/tmp/claude-0/work/audit2/reminder.png' });
  // экспорт через «Поделиться»
  await p.click('#privacyCard >> text=Сохранить копию файлом'); await p.waitForTimeout(400);
  ok(/share:file:\/\/\/cache\/ryadom-dannye-/.test(await p.evaluate(() => window.__log.join(' '))), 'экспорт уходит в системное «Поделиться»');
  // удаление всего очищает и копию
  await p.click('#privacyCard .pv-btn.danger'); await p.click('text=Да, удалить всё'); await p.waitForTimeout(1800);
  const prefs = await p.evaluate(() => JSON.parse(sessionStorage.getItem('__prefs') || '{}'));
  ok(!prefs['ryadom-backup-v1'] || !/ryadom-history/.test(prefs['ryadom-backup-v1']), 'после «Удалить всё» нативная копия тоже очищена');
  ok(await p.evaluate(() => !localStorage.getItem('ryadom-history')), 'и данные не вернулись после перезапуска');
  ok(errs.length === 0, 'нет ошибок JS ' + errs.join('; '));
  await b.close(); process.exit(fail ? 1 : 0);
})();
