/* Собирает www/ для приложения из веб-версии 01_Прототип/dist.
 * - убирает манифест PWA и service worker (в приложении они не нужны и мешают обновлениям);
 * - подключает native.js первым скриптом (нативное хранилище, кнопка «назад», напоминания и т. п.);
 * - по желанию подключает сервер с ИИ: RYADOM_API_URL=https://ваш-сервер npm run web */
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '../../01_Прототип/dist');
const OUT = path.resolve(__dirname, '../www');
const NATIVE = path.resolve(__dirname, '../native');

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true, filter: s => !/[\\/](sw\.js|manifest\.webmanifest)$/.test(s) });
for (const f of fs.readdirSync(NATIVE)) fs.copyFileSync(path.join(NATIVE, f), path.join(OUT, f));

let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
html = html.replace(/<link rel="manifest"[^>]*>\s*/, '');
html = html.replace(/<script>\s*try\{if\("serviceWorker"[\s\S]*?<\/script>\s*/, '');
html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
const api = process.env.RYADOM_API_URL ? process.env.RYADOM_API_URL.replace(/\/+$/, '') : '';
const inject = (api ? `<script>window.RYADOM_API={url:${JSON.stringify(api + '/api/dialogue')},rehearse:${JSON.stringify(api + '/api/rehearse')}};</script>\n  ` : '') +
  '<link rel="stylesheet" href="native.css">\n  <script src="native.js"></script>\n';
html = html.replace('</head>', '  ' + inject + '</head>');
if (/serviceWorker/.test(html)) throw new Error('service worker registration not removed');
if (!/native\.js/.test(html)) throw new Error('native.js not injected');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('www готов:', fs.readdirSync(OUT).length, 'файлов', api ? '(сервер ИИ: ' + api + ')' : '(без сервера ИИ: диалог на правилах)');
