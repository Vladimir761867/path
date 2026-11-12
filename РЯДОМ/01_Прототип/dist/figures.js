/* Фигуры поверх векторных сцен (assets/scenes/<bg>.svg). Фон без людей; в сцене рисуются ровно те,
 * кто в ней есть: герой и персонажи истории, каждый в своём постоянном облике (цвет одежды = цвет кружка-портрета).
 * Геометрия фигур совпадает с генератором сцен (scenes.py). */
(function () {
  'use strict';
  const SPOTS = {"office":[{"x":560,"y":420,"s":1.0,"pose":"sit","facing":1},{"x":1180,"y":540,"s":1.0,"pose":"stand","facing":-1}],"park":[{"x":560,"y":545,"s":0.85,"pose":"sit","facing":1},{"x":700,"y":545,"s":0.85,"pose":"sit","facing":-1},{"x":960,"y":610,"s":0.9,"pose":"stand","facing":-1}],"night":[{"x":700,"y":440,"s":1.0,"pose":"sit","facing":1},{"x":1180,"y":540,"s":0.95,"pose":"stand","facing":-1}],"studio":[{"x":470,"y":560,"s":1.0,"pose":"sit","facing":1},{"x":1020,"y":570,"s":1.0,"pose":"stand","facing":-1}],"balcony":[{"x":820,"y":520,"s":1.05,"pose":"stand","facing":-1},{"x":1100,"y":520,"s":1.05,"pose":"stand","facing":-1},{"x":560,"y":520,"s":1.0,"pose":"stand","facing":1}],"metro":[{"x":380,"y":460,"s":0.95,"pose":"sit","facing":1},{"x":820,"y":460,"s":0.95,"pose":"sit","facing":1},{"x":1240,"y":460,"s":0.95,"pose":"sit","facing":-1}],"lake":[{"x":860,"y":520,"s":0.9,"pose":"sit","facing":1},{"x":1040,"y":520,"s":0.9,"pose":"sit","facing":-1}],"party":[{"x":430,"y":450,"s":0.95,"pose":"sit","facing":1},{"x":640,"y":450,"s":0.95,"pose":"sit","facing":-1},{"x":860,"y":450,"s":0.95,"pose":"sit","facing":-1},{"x":1460,"y":560,"s":1.0,"pose":"stand","facing":-1}],"boxes":[{"x":820,"y":560,"s":1.0,"pose":"sit","facing":1},{"x":1120,"y":560,"s":1.0,"pose":"stand","facing":-1}],"family":[{"x":480,"y":450,"s":0.95,"pose":"sit","facing":1},{"x":780,"y":450,"s":0.95,"pose":"sit","facing":-1},{"x":1080,"y":560,"s":0.95,"pose":"stand","facing":-1}],"calm":[{"x":820,"y":600,"s":1.0,"pose":"sit","facing":1},{"x":1060,"y":600,"s":1.0,"pose":"sit","facing":-1},{"x":560,"y":600,"s":1.0,"pose":"sit","facing":1}],"meeting":[{"x":380,"y":480,"s":0.9,"pose":"sit","facing":1},{"x":1220,"y":480,"s":0.9,"pose":"sit","facing":-1},{"x":800,"y":470,"s":0.85,"pose":"sit","facing":1}],"cafe2":[{"x":560,"y":470,"s":0.9,"pose":"sit","facing":1},{"x":830,"y":470,"s":0.9,"pose":"sit","facing":-1},{"x":1200,"y":560,"s":0.95,"pose":"stand","facing":-1}],"kitchen2":[{"x":980,"y":470,"s":0.95,"pose":"sit","facing":1},{"x":1220,"y":470,"s":0.95,"pose":"sit","facing":-1}],"street2":[{"x":620,"y":600,"s":0.95,"pose":"stand","facing":1},{"x":900,"y":600,"s":0.95,"pose":"stand","facing":-1},{"x":1180,"y":600,"s":0.95,"pose":"stand","facing":-1}]};
  const AMBIENT = { metro: 1, party: 1 };
  const SKIN = ['#e9c2a6', '#d7a07c', '#b9805c', '#8d5a3e', '#f0cfb6'];
  const AMB = [{ top: '#81b29a', hair: '#6b4a2f', skin: 2, style: 'short' }, { top: '#f2cc8f', hair: '#2a1d17', skin: 3, style: 'curly' }, { top: '#e5989b', hair: '#1d1a19', skin: 1, style: 'bun' }];
  const r = (x, y, w, h, f, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 0}" fill="${f}"/>`;
  const c = (x, y, rr, f) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${f}"/>`;
  const p = (d, f, ex) => `<path d="${d}" fill="${f}" ${ex || ''}/>`;
  function hairOf(style, hy, hair) {
    if (style === 'long') return p(`M-36,${hy + 24} C-40,${hy - 16} -10,${hy - 26} 8,${hy - 14} C30,${hy - 24} 44,${hy} 38,${hy + 20} C44,${hy + 60} 40,${hy + 92} 30,${hy + 110} L-34,${hy + 112} C-46,${hy + 84} -44,${hy + 54} -36,${hy + 24}Z`, hair);
    if (style === 'bun') return c(-12, hy - 14, 18, hair) + p(`M-36,${hy + 30} C-38,${hy - 12} -6,${hy - 20} 10,${hy - 10} C32,${hy - 14} 40,${hy + 6} 36,${hy + 24} C24,${hy + 8} 0,${hy + 4} -20,${hy + 14}Z`, hair);
    if (style === 'curly') return [[-24, 8, 16], [-6, -4, 18], [14, -2, 17], [30, 14, 14], [-32, 28, 13]].map(([dx, dy, rr]) => c(dx, hy + dy, rr, hair)).join('');
    if (style === 'grey') return p(`M-36,${hy + 30} C-38,${hy - 8} -8,${hy - 14} 10,${hy - 8} C34,${hy - 8} 40,${hy + 10} 36,${hy + 26} C26,${hy + 12} 4,${hy + 8} -18,${hy + 16} C-26,${hy + 20} -30,${hy + 30} -36,${hy + 30}Z`, hair);
    return p(`M-36,${hy + 30} C-38,${hy - 8} -8,${hy - 14} 10,${hy - 8} C34,${hy - 8} 40,${hy + 10} 36,${hy + 26} C26,${hy + 12} 4,${hy + 8} -18,${hy + 16} C-26,${hy + 20} -30,${hy + 30} -36,${hy + 30}Z`, hair);
  }
  function person(sp, look) {
    const k = sp.s * 1.18, f = sp.facing, sk = SKIN[(look.skin || 0) % SKIN.length], top = look.top || '#4f7a66', bottom = look.bottom || '#38485a', hair = look.hair || '#3a2a22';
    const stand = sp.pose === 'stand', fy = stand ? 0 : 112, hy = stand ? -330 : -250, g = [];
    g.push(`<ellipse cx="${sp.x + (stand ? 0 : 20) * k * f}" cy="${sp.y + fy * k}" rx="${70 * k}" ry="${10 * k}" fill="#1b2a24" opacity=".16"/>`);
    g.push(`<g transform="translate(${sp.x},${sp.y}) scale(${f * k},${k})">`);
    if (stand) {
      g.push(p('M-26,-150 L-30,0 L-6,0 L0,-120 L6,0 L30,0 L26,-150Z', bottom), r(-34, -4, 30, 10, '#2a2f36', 5), r(4, -4, 30, 10, '#2a2f36', 5));
      g.push(p('M-46,-150 C-50,-215 -40,-262 0,-270 C40,-262 50,-215 46,-150Z', top));
      g.push(p('M40,-250 C58,-215 60,-180 52,-150', 'none', `stroke="${top}" stroke-width="20" stroke-linecap="round"`), p('M-40,-250 C-58,-215 -60,-180 -52,-150', 'none', `stroke="${top}" stroke-width="20" stroke-linecap="round"`));
      g.push(c(54, -146, 10, sk), c(-54, -146, 10, sk));
    } else {
      g.push(p('M-30,-8 L56,-8 C70,-8 74,4 72,16 L66,110 L46,110 L48,22 L-30,22Z', bottom), r(40, 104, 34, 10, '#2a2f36', 5));
      g.push(p('M-44,-6 C-50,-110 -40,-176 0,-186 C40,-176 50,-110 44,-6Z', top));
      g.push(p('M36,-160 C58,-120 66,-86 74,-64', 'none', `stroke="${top}" stroke-width="20" stroke-linecap="round"`), c(78, -60, 10, sk));
    }
    g.push(r(-9, hy + 50, 18, 26, sk, 6), c(0, hy + 26, 34, sk), hairOf(look.style, hy, hair));
    if (look.hold === 'phone') g.push(r(70, -96, 22, 38, '#1f2a33', 5), r(73, -92, 16, 28, '#bfe3ff', 3));
    g.push('</g>'); return g.join('');
  }
  /** svg-строка сцены: фон + фигуры. looks — массив обликов по порядку: герой, затем персонажи. */
  function scene(bg, looks, label) {
    const spots = SPOTS[bg]; if (!spots) return null;
    const figs = []; spots.forEach((sp, i) => { const lk = looks[i] || (AMBIENT[bg] ? AMB[i % AMB.length] : null); if (lk) figs.push(person(sp, lk)); });
    return `<svg class="qc-art" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${(label || '').replace(/"/g, '')}"><image href="assets/scenes/${bg}.svg" width="1600" height="700"/>${figs.join('')}<defs><linearGradient id="qcfade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#102821" stop-opacity="0"/><stop offset="1" stop-color="#102821" stop-opacity=".78"/></linearGradient></defs><rect width="1600" height="700" fill="url(#qcfade)"/></svg>`;
  }
  window.RyadomFigures = { scene, has: bg => !!SPOTS[bg] };
})();
