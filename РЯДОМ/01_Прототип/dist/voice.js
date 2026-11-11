/* Озвучка ответов помощника средствами браузера (по желанию, выключена по умолчанию). Ничего не отправляется наружу. */
(function () {
  'use strict';
  if (!('speechSynthesis' in window)) return;
  const KEY = 'ryadom-voice-out';
  let on = false; try { on = localStorage.getItem(KEY) === '1'; } catch { /* нет хранилища */ }
  const form = document.querySelector('#form'); if (!form) return;
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'voice-toggle';
  const paint = () => { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.textContent = on ? '🔊' : '🔈'; btn.title = on ? 'Озвучка ответов включена' : 'Озвучивать ответы'; btn.setAttribute('aria-label', btn.title); };
  btn.onclick = () => { on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* */ } if (!on) speechSynthesis.cancel(); paint(); if (on) speak('Озвучка включена.'); };
  paint(); form.append(btn);
  function speak(t) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).replace(/\s+/g, ' ').slice(0, 600)); u.lang = (window.RYADOM_LOCALE || 'ru-RU'); u.rate = 0.95; speechSynthesis.speak(u); } catch { /* голос недоступен */ }
  }
  const orig = window.add;
  if (typeof orig === 'function') window.add = function (text, me) { const r = orig.apply(this, arguments); if (!me && on) speak(text); return r; };
})();
