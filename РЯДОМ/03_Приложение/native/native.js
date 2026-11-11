/* «Рядом» в приложении (Capacitor): всё, чего нет у сайта.
 * 1) Надёжное хранение: данные дублируются в нативное хранилище (Preferences) и восстанавливаются,
 *    если система очистила память WebView.
 * 2) Кнопка «назад» на Android: закрывает окно → возвращает на «Сегодня» → сворачивает приложение.
 * 3) Статус-бар и заставка в цветах приложения.
 * 4) Экспорт данных через системное «Поделиться» (в WebView скачивание файлов не работает).
 * 5) Ежедневное напоминание (локальное уведомление, без сервера) — настраивается в «Обо мне».
 * 6) Лёгкая тактильная отдача на кнопках ответа.
 * На обычном сайте файл ничего не делает. */
(function () {
  'use strict';
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const P = C.Plugins || {};
  const platform = C.getPlatform();
  document.documentElement.classList.add('native', 'native-' + platform);

  const BACKUP = 'ryadom-backup-v1';
  const REMIND = 'ryadom-reminder-v1';
  const isOurs = k => typeof k === 'string' && k.indexOf('ryadom-') === 0;
  const safe = fn => { try { return fn(); } catch (e) { return undefined; } };

  const T = s => (window.RyadomI18n ? window.RyadomI18n.t(s) : s);
  /* ---------- 1. Хранилище ---------- */
  const ls = window.localStorage;
  const proto = Object.getPrototypeOf(ls);
  const origSet = proto.setItem, origRemove = proto.removeItem, origClear = proto.clear;
  function snapshot() {
    const data = {};
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (isOurs(k)) data[k] = ls.getItem(k); }
    return data;
  }
  let timer = null, restoring = true;
  function scheduleBackup() {
    if (!P.Preferences || restoring) return;
    clearTimeout(timer);
    timer = setTimeout(() => { P.Preferences.set({ key: BACKUP, value: JSON.stringify({ at: Date.now(), data: snapshot() }) }).catch(() => {}); }, 400);
  }
  proto.setItem = function (k, v) { const r = origSet.call(this, k, v); if (this === ls && isOurs(k)) scheduleBackup(); return r; };
  proto.removeItem = function (k) { const r = origRemove.call(this, k); if (this === ls && isOurs(k)) scheduleBackup(); return r; };
  proto.clear = function () { const r = origClear.call(this); if (this === ls) scheduleBackup(); return r; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && P.Preferences && !restoring) P.Preferences.set({ key: BACKUP, value: JSON.stringify({ at: Date.now(), data: snapshot() }) }).catch(() => {}); });

  // Восстановление: если WebView потерял данные, а копия есть — возвращаем и перезапускаем страницу один раз.
  // Пока идёт проверка, страница скрыта под заставкой, а копия не перезаписывается.
  const hasLocal = Object.keys(snapshot()).some(k => k !== 'ryadom-consent-v1');
  let restoreDone;
  if (!hasLocal && P.Preferences && !sessionStorage.getItem('ryadom-restored')) {
    document.documentElement.classList.add('native-booting');
    restoreDone = P.Preferences.get({ key: BACKUP }).then(r => {
      const b = r && r.value ? safe(() => JSON.parse(r.value)) : null;
      const keys = b && b.data ? Object.keys(b.data).filter(isOurs) : [];
      if (keys.length > 1) {
        keys.forEach(k => origSet.call(ls, k, b.data[k]));
        sessionStorage.setItem('ryadom-restored', '1');
        location.reload();
        return new Promise(() => {});
      }
    }).catch(() => {});
  } else restoreDone = Promise.resolve();
  restoreDone = Promise.race([restoreDone, new Promise(r => setTimeout(r, 1500))]).then(() => {
    restoring = false; document.documentElement.classList.remove('native-booting'); scheduleBackup();
  });

  /* ---------- 2. Кнопка «назад» (Android) ---------- */
  function closeSomething() {
    const inline = document.querySelector('.inline-confirm'); if (inline) { inline.remove(); return true; }
    const pv = document.querySelector('.pv-overlay'); if (pv && localStorage.getItem('ryadom-consent-v1')) { pv.remove(); return true; }
    const focus = document.getElementById('focusOverlay'); if (focus && !focus.hidden) { const b = focus.querySelector('.focus-close'); if (b) b.click(); return true; }
    const ov = document.getElementById('overlay'); if (ov && ov.classList.contains('show')) { const b = document.getElementById('close'); if (b) b.click(); return true; }
    const qback = document.querySelector('#games.active .qz-top button'); if (qback) { qback.click(); return true; }
    const play = document.getElementById('gamePlay'); if (play && !play.hidden && document.querySelector('#games.active')) { const b = play.querySelector('button'); if (b) { b.click(); return true; } }
    const active = document.querySelector('.section.active');
    if (active && active.id !== 'today' && typeof window.view === 'function') { window.view('today'); return true; }
    return false;
  }
  if (P.App) P.App.addListener('backButton', () => { if (!closeSomething()) P.App.minimizeApp().catch(() => P.App.exitApp()); });

  /* ---------- 3. Статус-бар и заставка ---------- */
  function paintBars() {
    if (!P.StatusBar) return;
    const dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    P.StatusBar.setStyle({ style: 'LIGHT' }).catch(() => {});
    if (platform === 'android') P.StatusBar.setBackgroundColor({ color: '#f5f3ed' }).catch(() => {});
    void dark;
  }
  function ready() {
    paintBars();
    restoreDone.then(() => { if (P.SplashScreen) setTimeout(() => P.SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {}), 120); });
    hookHaptics();
    hookReminderUi();
    checkReminderLaunch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  /* ---------- 4. Экспорт через «Поделиться» ---------- */
  async function shareFile(name, text) {
    if (!P.Filesystem || !P.Share) throw new Error('no-share');
    const w = await P.Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
    await P.Share.share({ title: T('Данные «Рядом»'), text: T('Копия данных приложения «Рядом». Храни её в надёжном месте.'), files: [w.uri], dialogTitle: T('Сохранить копию') });
    return true;
  }

  /* ---------- 5. Напоминание ---------- */
  const LN = P.LocalNotifications;
  const readR = () => safe(() => JSON.parse(localStorage.getItem(REMIND) || 'null')) || { on: false, time: '20:00' };
  const writeR = r => safe(() => localStorage.setItem(REMIND, JSON.stringify(r)));
  const TEXTS = ['Как ты сегодня? Можно отметить состояние за минуту.', 'Минутка для себя: как прошёл день?', 'Если день был непростым — я рядом. Можно просто отметить настроение.'];
  async function applyReminder(r) {
    if (!LN) return { ok: false, msg: 'Напоминания недоступны на этом устройстве.' };
    await LN.cancel({ notifications: [{ id: 7101 }] }).catch(() => {});
    if (!r.on) return { ok: true, msg: 'Напоминание выключено.' };
    let perm = await LN.checkPermissions().catch(() => ({ display: 'denied' }));
    if (perm.display !== 'granted') perm = await LN.requestPermissions().catch(() => ({ display: 'denied' }));
    if (perm.display !== 'granted') return { ok: false, msg: 'Уведомления запрещены. Их можно разрешить в настройках телефона для приложения «Рядом».' };
    const [hh, mm] = r.time.split(':').map(Number);
    await LN.schedule({ notifications: [{ id: 7101, title: T('Рядом'), body: T(TEXTS[Math.floor(Math.random() * TEXTS.length)]), schedule: { on: { hour: hh, minute: mm }, allowWhileIdle: true }, extra: { open: 'history' } }] });
    return { ok: true, msg: 'Готово: каждый день в ' + r.time + '. Пропускать можно — это просто приглашение.' };
  }
  function checkReminderLaunch() {
    if (!LN) return;
    LN.addListener('localNotificationActionPerformed', ev => {
      const to = ev && ev.notification && ev.notification.extra && ev.notification.extra.open;
      if (to && typeof window.view === 'function') window.view(to);
    }).catch(() => {});
  }
  function reminderCard() {
    const r = readR();
    const card = document.createElement('div'); card.className = 'pv-card nt-card'; card.id = 'reminderCard';
    const h = document.createElement('h3'); h.textContent = 'Напоминание';
    const p = document.createElement('p'); p.textContent = 'Раз в день мягко напомню отметить состояние. Работает без интернета, ничего никуда не отправляется.';
    const row = document.createElement('div'); row.className = 'nt-row';
    const lab = document.createElement('label'); lab.className = 'nt-switch';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!r.on; cb.setAttribute('aria-label', 'Ежедневное напоминание');
    lab.append(cb, document.createTextNode(' Каждый день'));
    const time = document.createElement('input'); time.type = 'time'; time.value = r.time; time.setAttribute('aria-label', 'Время напоминания');
    row.append(lab, time);
    const msg = document.createElement('p'); msg.className = 'pv-msg'; msg.setAttribute('role', 'status'); msg.hidden = true;
    const upd = async () => { const nr = { on: cb.checked, time: time.value || '20:00' }; const res = await applyReminder(nr); if (!res.ok && nr.on) { cb.checked = false; nr.on = false; } writeR(nr); msg.textContent = res.msg; msg.className = 'pv-msg' + (res.ok ? '' : ' err'); msg.hidden = false; };
    cb.onchange = upd; time.onchange = () => { if (cb.checked) upd(); else writeR({ on: false, time: time.value }); };
    card.append(h, p, row, msg);
    return card;
  }
  function hookReminderUi(tries) {
    const sec = document.getElementById('profile'); if (!sec) { if ((tries || 0) < 40) setTimeout(() => hookReminderUi((tries || 0) + 1), 100); return; }
    const attach = () => {
      if (sec.querySelector('#reminderCard')) return;
      const priv = sec.querySelector('#privacyCard');
      const c = reminderCard();
      if (priv) priv.before(c); else sec.append(c);
    };
    attach(); new MutationObserver(attach).observe(sec, { childList: true });
  }

  /* ---------- 6. Тактильная отдача ---------- */
  function hookHaptics() {
    if (!P.Haptics) return;
    document.addEventListener('click', e => {
      const t = e.target && e.target.closest && e.target.closest('.choice, .qz-opt, .start-btn, .mobile-nav button, .send, .focus-main');
      if (t) P.Haptics.impact({ style: 'LIGHT' }).catch(() => {});
    }, true);
  }

    async function clearBackup() {
    clearTimeout(timer); restoring = true;
    if (LN) await LN.cancel({ notifications: [{ id: 7101 }] }).catch(() => {});
    if (P.Preferences) await P.Preferences.remove({ key: BACKUP }).catch(() => {});
  }
  window.RyadomNative = { platform, shareFile, applyReminder, clearBackup, backupNow: scheduleBackup };
})();
