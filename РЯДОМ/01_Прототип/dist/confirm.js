/* Встроенное подтверждение вместо window.confirm: в приложениях и встроенных страницах системные диалоги могут не работать. */
(function () {
  'use strict';
  window.askConfirm = function (message, anchor, onYes, opts) {
    opts = opts || {};
    document.querySelectorAll('.inline-confirm').forEach(x => x.remove());
    const box = document.createElement('div'); box.className = 'inline-confirm'; box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-live', 'assertive');
    const p = document.createElement('p'); p.textContent = message; box.append(p);
    const row = document.createElement('div'); row.className = 'inline-confirm-row';
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'inline-confirm-yes'; yes.textContent = opts.yes || 'Да, удалить';
    const no = document.createElement('button'); no.type = 'button'; no.className = 'inline-confirm-no'; no.textContent = opts.no || 'Отмена';
    yes.onclick = () => { box.remove(); onYes(); };
    no.onclick = () => { box.remove(); if (anchor && anchor.focus) anchor.focus(); };
    row.append(yes, no); box.append(row);
    if (anchor && anchor.parentNode) anchor.insertAdjacentElement('afterend', box); else document.body.append(box);
    box.addEventListener('keydown', e => { if (e.key === 'Escape') no.click(); });
    setTimeout(() => yes.focus(), 30);
    return box;
  };
})();
