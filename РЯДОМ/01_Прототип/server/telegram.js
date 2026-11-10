/* Telegram-бот «Рядом» (long polling, без зависимостей). Запускается из server.js, если задан TELEGRAM_BOT_TOKEN.
 * Тот же диалог и те же проверки безопасности, что на сайте. История разговора — только в памяти процесса,
 * стирается командой /forget и через 24 часа без сообщений. Тексты не логируются.
 * Переменные: TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_IDS (через запятую, необязательно), TELEGRAM_API_BASE (для тестов). */
'use strict';
const SAFETY = {
  self: 'Спасибо, что говоришь об этом. Твоя безопасность сейчас важнее всего. Если есть риск, что ты причинишь себе вред, обратись за срочной помощью прямо сейчас.\nЭкстренный номер: 112 (Россия и страны ЕС). В других странах — местный экстренный номер.\nЕсли рядом есть человек, скажи ему: «Мне сейчас очень тяжело, побудь со мной».',
  others: 'Похоже, ты очень зол или напуган. Сейчас важно не оставаться с этим наедине и не действовать на эмоциях. Отойди от человека или ситуации и свяжись со службой помощи.\nЭкстренный номер: 112 (Россия и страны ЕС).',
  danger: 'Если тебе сейчас небезопасно, постарайся уйти в безопасное место и позвони по экстренному номеру: 112 (Россия и страны ЕС). Я здесь, но срочную помощь окажут люди рядом.'
};
const GREET = 'Привет. Я «Рядом» — цифровой помощник: не человек и не врач, но могу выслушать и помочь выбрать небольшой шаг. Что сейчас происходит? Можно писать своими словами.\n\n/forget — стереть этот разговор из памяти\n/help — что я умею';
const HELP = 'Я слушаю, помогаю разобраться и предлагаю небольшие шаги. Я не врач и не заменяю близких. Разговор хранится только в памяти и стирается через сутки или по команде /forget. Если тебе сейчас небезопасно, позвони по 112.';
const FALLBACK = 'Я рядом и слушаю. Расскажи чуть подробнее: что случилось и что ты при этом чувствуешь?';
const TTL = 24 * 3600e3;

function startBot({ token, handle, base, allowed }) {
  base = (base || 'https://api.telegram.org').replace(/\/$/, '');
  const api = (m, body, signal) => fetch(base + '/bot' + token + '/' + m, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), signal }).then(r => r.json());
  const chats = new Map();
  let offset = 0, stopped = false;
  const send = (id, text) => api('sendMessage', { chat_id: id, text: String(text).slice(0, 3500) }).catch(() => { });

  async function onMessage(msg) {
    const id = msg.chat && msg.chat.id; const text = (msg.text || '').trim();
    if (!id || !text) return;
    if (allowed && allowed.size && !allowed.has(String(id))) return;
    const now = Date.now(); let st = chats.get(id);
    if (!st || now - st.ts > TTL) st = { turns: [], awaitRisk: false, ts: now };
    st.ts = now; chats.set(id, st);
    if (chats.size > 2000) { for (const [k, v] of chats) if (now - v.ts > TTL) chats.delete(k); }
    if (text === '/start') return send(id, GREET);
    if (text === '/help') return send(id, HELP);
    if (text === '/forget') { chats.delete(id); return send(id, 'Готово: этот разговор стёрт из памяти.'); }
    if (st.awaitRisk) {
      st.awaitRisk = false;
      if (/^\s*(да|ага|возможно|иногда|наверное|не знаю|не уверен|не уверена)/i.test(text)) return send(id, SAFETY.self);
    }
    st.turns.push({ role: 'user', text: text.slice(0, 1200) }); st.turns = st.turns.slice(-12);
    let r;
    try { r = await handle({ messages: st.turns, context: { noPractice: true, noAdvice: false, practices: [], profile: {}, recent: [] } }); } catch { r = null; }
    const j = r && r.json;
    if (j && SAFETY[j.risk]) return send(id, SAFETY[j.risk]);
    if (j && j.risk === 'check') { st.awaitRisk = true; return send(id, 'Прежде чем продолжить, хочу спросить прямо, потому что это важно: ты сейчас думаешь о том, чтобы причинить себе вред или не жить?'); }
    if (!j || j.fallback || !j.reply) { return send(id, FALLBACK); }
    st.turns.push({ role: 'assistant', text: j.reply });
    return send(id, j.reply + (j.question ? '\n\n' + j.question : ''));
  }

  (async function loop() {
    while (!stopped) {
      try {
        const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 40000);
        const res = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] }, ctrl.signal); clearTimeout(t);
        for (const u of (res && res.result) || []) { offset = u.update_id + 1; if (u.message) await onMessage(u.message); }
      } catch { await new Promise(r => setTimeout(r, 3000)); }
    }
  })();
  return { stop() { stopped = true; }, _chats: chats };
}
module.exports = { startBot };
