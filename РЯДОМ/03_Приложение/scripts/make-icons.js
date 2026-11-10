/* Рисует исходники иконок и заставки (assets/*.png) из SVG. Затем: npm run icons */
const { chromium } = require('playwright'); const path = require('path');
const mark = (c, w) => { let s = ''; for (let i = 0; i < 4; i++) s += `<line x1="0" y1="-1" x2="0" y2="1" transform="rotate(${i * 45})" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; return s; };
const svg = (size, bg, fg, scale, round) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${bg ? `<rect width="${size}" height="${size}" ${round ? `rx="${size * 0.22}"` : ''} fill="${bg}"/>` : ''}
<g transform="translate(${size / 2} ${size / 2}) scale(${size * scale})">${mark(fg, 0.17)}<circle r="0.13" fill="${bg || 'none'}" /></g></svg>`;
const out = (n) => path.join(__dirname, '..', 'assets', n);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const shot = async (s, size, file, transparent) => { await p.setViewportSize({ width: size, height: size }); await p.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`); await p.screenshot({ path: file, omitBackground: !!transparent, clip: { x: 0, y: 0, width: size, height: size } }); };
  await shot(svg(1024, '#315f4c', '#f5f3ed', 0.30, false), 1024, out('icon-only.png'));
  await shot(svg(1024, null, '#f5f3ed', 0.22, false), 1024, out('icon-foreground.png'), true);
  await shot(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#315f4c"/></svg>`, 1024, out('icon-background.png'));
  await shot(svg(2732, '#f5f3ed', '#315f4c', 0.07, false), 2732, out('splash.png'));
  await shot(svg(2732, '#18241f', '#9cc7ad', 0.07, false), 2732, out('splash-dark.png'));
  for (const [d, s] of [['mdpi', 24], ['hdpi', 36], ['xhdpi', 48], ['xxhdpi', 72], ['xxxhdpi', 96]]) await shot(svg(s, null, '#ffffff', 0.36, false), s, out(`ic_stat_ryadom-${d}.png`), true);
  await b.close(); console.log('assets готовы');
})();
