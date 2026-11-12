/* Приватность: экран согласия при первом запуске и раздел «Данные и конфиденциальность» в «Обо мне»:
 * что хранится, экспорт, импорт, удаление всего. Всё работает локально, ничего никуда не отправляется. */
(function () {
  'use strict';
  const CONSENT = 'ryadom-consent-v1';
  const NAMES = {
    'ryadom-checkins': 'Отметки состояния', 'ryadom-history': 'Дневник настроения', 'ryadom-dialogues-v1': 'Разговоры',
    'ryadom-profile-v1': 'Профиль «Обо мне»', 'ryadom-place-favorites-v1': 'Избранные места', 'ryadom-place-visits-v1': 'Посещённые места',
    'ryadom-discovery-places-v1': 'Найденные места', 'ryadom-places-city-v1': 'Выбранный город', 'ryadom-stats-v1': 'Счётчики на этом устройстве',
    'ryadom-chains-v1': 'Цепочки практик', 'ryadom-voice-consent': 'Согласие на голос', 'ryadom-voice-out': 'Настройка озвучки',
    'ryadom-v4': 'Прогресс игр', 'ryadom-consent-v1': 'Отметка о вводном экране', 'ryadom-worlds-v1': 'Прогресс историй', 'ryadom-story-v1': 'Прогресс историй', 'ryadom-story-v2': 'Прогресс историй'
  };
  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (text, cls, fn) => { const b = $('button', 'pv-btn' + (cls ? ' ' + cls : ''), text); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const safe = fn => { try { return fn(); } catch { return undefined; } };

  const keys = () => { const out = []; safe(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('ryadom-') === 0) out.push(k); } }); return out.sort(); };
  function friendly(k) {
    if (NAMES[k]) return NAMES[k];
    if (k.indexOf('ryadom-quest-') === 0) return 'Прогресс квестов';
    if (k.indexOf('ryadom-story-v2-') === 0) return 'Прогресс историй';
    return 'Другие данные приложения';
  }
  function summary() {
    const m = new Map();
    keys().forEach(k => { const f = friendly(k); m.set(f, (m.get(f) || 0) + (safe(() => (localStorage.getItem(k) || '').length) || 0)); });
    return Array.from(m.entries());
  }
  const kb = n => n < 1024 ? n + ' Б' : (n / 1024).toFixed(1).replace('.', ',') + ' КБ';

  function exportJson() {
    const data = {}; keys().forEach(k => { data[k] = safe(() => localStorage.getItem(k)); });
    return JSON.stringify({ app: 'ryadom', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
  }
  function importJson(text) {
    let o; try { o = JSON.parse(text); } catch { return { ok: false, msg: 'Не удалось прочитать: это не файл данных «Рядом».' }; }
    if (!o || o.app !== 'ryadom' || !o.data || typeof o.data !== 'object') return { ok: false, msg: 'Это не файл данных «Рядом».' };
    const ks = Object.keys(o.data).filter(k => k.indexOf('ryadom-') === 0 && typeof o.data[k] === 'string');
    if (!ks.length) return { ok: false, msg: 'В файле нет данных для восстановления.' };
    ks.forEach(k => safe(() => localStorage.setItem(k, o.data[k])));
    return { ok: true, n: ks.length };
  }
  function wipe() { keys().forEach(k => safe(() => localStorage.removeItem(k))); safe(() => sessionStorage.clear()); }

  /* ---------- экран при первом запуске ---------- */
  function points() {
    const ul = $('ul', 'pv-points');
    [['🤝', 'Что это', 'Цифровой помощник для разговора о состоянии, тренировки трудных разговоров и подбора мест. Это не врач и не психолог, диагнозов не ставит и не заменяет специалиста.'],
     ['🔒', 'Где данные', 'Дневник, разговоры и «Обо мне» хранятся только на этом устройстве. Ты можешь выгрузить их или удалить всё в разделе «Обо мне».'],
     ['🌐', 'Что уходит наружу', 'Поиск мест отправляет запрос карте (OpenStreetMap). Если подключён режим с сервером и ИИ, текст сообщения уходит на сервер для ответа. Голосовой ввод использует службы твоего устройства.'],
     ['🆘', 'Если тяжело всерьёз', 'При мыслях о вреде себе или другим обратись к человеку рядом или по номеру 112. Приложение подскажет, но срочную помощь оно не заменит.']
    ].forEach(r => { const li = $('li'); li.append($('i', null, r[0])); const d = $('div'); d.append($('b', null, r[1]), document.createTextNode(r[2])); li.append(d); ul.append(li); });
    return ul;
  }
  function showConsent(onDone, reopen) {
    const ov = $('div', 'pv-overlay'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'pvTitle');
    const sh = $('div', 'pv-sheet');
    const h = $('h2', null, 'Прежде чем начать'); h.id = 'pvTitle';
    if (window.RyadomI18n) sh.append(window.RyadomI18n.picker());
    sh.append(h, $('p', null, 'Коротко о том, как устроено «Рядом».'), points());
    const ok = btn(reopen ? 'Закрыть' : 'Понятно, продолжить', '', () => { if (!reopen) safe(() => localStorage.setItem(CONSENT, new Date().toISOString())); ov.remove(); if (onDone) onDone(); });
    sh.append(ok); ov.append(sh); document.body.append(ov);
    ov.addEventListener('keydown', e => { if (e.key === 'Escape' && reopen) ok.click(); });
    setTimeout(() => { try { h.tabIndex = -1; h.focus({ preventScroll: true }); } catch { /* ок */ } }, 50);
  }

  /* ---------- раздел в «Обо мне» ---------- */
  function build() {
    const card = $('div', 'pv-card'); card.id = 'privacyCard';
    card.append($('h3', null, 'Данные и конфиденциальность'),
      $('p', null, 'Всё, что ты вводишь, остаётся на этом устройстве. Здесь можно посмотреть, что хранится, сохранить копию или удалить всё.'));
    const ul = $('ul', 'pv-list'); const rows = summary();
    if (!rows.length) ul.append($('li', null, 'Пока ничего не сохранено'));
    rows.forEach(r => { const li = $('li'); li.append($('span', null, r[0]), $('span', null, kb(r[1]))); ul.append(li); });
    card.append(ul);
    const msg = $('p', 'pv-msg'); msg.setAttribute('role', 'status'); msg.hidden = true;
    const say = (t, err) => { msg.textContent = t; msg.className = 'pv-msg' + (err ? ' err' : ''); msg.hidden = false; };
    const area = $('textarea'); area.hidden = true; area.setAttribute('aria-label', 'Данные для переноса');
    const row = $('div', 'pv-row');

    row.append(btn('Сохранить копию файлом', 'ghost', () => {
      const json = exportJson();
      const fname = 'ryadom-dannye-' + new Date().toISOString().slice(0, 10) + '.json';
      if (window.RyadomNative && window.RyadomNative.shareFile) {
        window.RyadomNative.shareFile(fname, json).then(() => say('Выбери, куда сохранить: «Файлы», облако, почта или мессенджер себе.'), () => say('Не получилось открыть «Поделиться». Воспользуйся кнопкой «Скопировать текст».', true));
        return;
      }
      try {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = fname; document.body.append(a); a.click(); a.remove();
        say('Файл сохраняется. Если ничего не произошло — воспользуйся кнопкой «Скопировать текст».');
      } catch { say('Не получилось сохранить файл. Воспользуйся кнопкой «Скопировать текст».', true); }
    }));
    row.append(btn('Скопировать текст', 'ghost', () => {
      const json = exportJson(); area.value = json; area.hidden = false;
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(json) : Promise.reject()).then(() => say('Скопировано. Вставь в заметки или сообщение себе.'), () => { area.select(); say('Скопировать автоматически не вышло. Текст выделен — скопируй его вручную.', true); });
    }));

    const imp = $('input'); imp.type = 'file'; imp.accept = 'application/json,.json'; imp.hidden = true; imp.setAttribute('aria-label', 'Файл с данными');
    imp.onchange = () => { const f = imp.files && imp.files[0]; if (!f) return; if (f.size > 5e6) return say('Файл слишком большой.', true); const r = new FileReader(); r.onload = () => doImport(String(r.result)); r.readAsText(f); };
    function doImport(text) { const res = importJson(text); if (!res.ok) return say(res.msg, true); say('Данные восстановлены (' + res.n + '). Обновляю приложение…'); setTimeout(() => location.reload(), 900); }
    row.append(btn('Восстановить из файла', 'ghost', () => imp.click()), imp);
    row.append(btn('Восстановить из вставленного текста', 'ghost', () => {
      if (area.hidden || !area.value.trim()) { area.hidden = false; area.value = ''; area.placeholder = 'Вставь сюда скопированный текст и нажми кнопку ещё раз'; area.focus(); return; }
      doImport(area.value);
    }));
    card.append(row, area, msg);

    const danger = $('div', 'pv-row');
    const del = btn('Удалить все мои данные', 'danger', () => {
      danger.replaceChildren($('p', 'pv-msg err', 'Будут удалены дневник, разговоры, «Обо мне», места и прогресс игр на этом устройстве. Вернуть их будет нельзя, если нет копии.'),
        btn('Да, удалить всё', 'danger', () => { wipe(); danger.replaceChildren($('p', 'pv-msg', 'Всё удалено. Обновляю приложение…')); const done = () => setTimeout(() => location.reload(), 500); if (window.RyadomNative && window.RyadomNative.clearBackup) window.RyadomNative.clearBackup().then(done, done); else done(); }),
        btn('Отмена', 'ghost', () => { danger.replaceChildren(del); }));
    });
    danger.append(del); card.append(danger);

    const det = $('details'); det.append($('summary', null, 'Как приложение обращается с данными'));
    [['Где хранятся', 'В памяти браузера или приложения на этом устройстве. Учётных записей и серверной базы нет. Если очистить данные браузера или сменить устройство без копии, записи пропадут.'],
     ['Что передаётся наружу', 'Поиск мест: текст запроса и, если разрешишь, примерные координаты уходят в сервисы карт OpenStreetMap (Photon, Nominatim). Режим с сервером и ИИ, если он подключён: текст твоих сообщений уходит на сервер и к ИИ-провайдеру, чтобы получить ответ. Голосовой ввод и озвучка используют службы устройства.'],
     ['Что приложение не делает', 'Не следит за перемещениями, не продаёт и не показывает рекламу, не ставит диагнозов. Счётчики использования считаются только на этом устройстве.'],
     ['Важно', 'Приложение не является медицинским изделием и не заменяет помощь специалиста. Это прототип, и тексты ещё не проверены психологом.']
    ].forEach(r => { const p = $('p'); p.append($('b', null, r[0] + '. '), document.createTextNode(r[1])); det.append(p); });
    card.append(det);
    const pol = $('a', 'pv-link', 'Полная политика конфиденциальности'); pol.href = 'privacy-policy.html'; pol.target = '_blank'; pol.rel = 'noopener';
    card.append(pol);
    const again = $('button', 'pv-link', 'Показать вводную ещё раз'); again.type = 'button'; again.onclick = () => showConsent(null, true);
    card.append(again, $('p', 'pv-crisis', 'Если сейчас очень тяжело или есть риск навредить себе, позвони по номеру 112 или обратись к близкому человеку.'));
    return card;
  }
  function attach() {
    const sec = document.getElementById('profile'); if (!sec) return;
    if (sec.querySelector('#privacyCard')) return;
    sec.append(build());
  }
  function init() {
    const sec = document.getElementById('profile');
    if (sec) { attach(); new MutationObserver(() => { if (!sec.querySelector('#privacyCard')) attach(); }).observe(sec, { childList: true }); }
    const given = safe(() => localStorage.getItem(CONSENT));
    if (!given) showConsent();
  }
  window.RyadomPrivacy = { exportJson, importJson, wipe, keys };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
