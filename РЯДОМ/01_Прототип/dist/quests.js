/* Квесты-тренажёры разговоров: сцена нарисована в SVG, ответ либо пускает дальше, либо оставляет на месте.
 * «Правильность» опирается на названные в каждом шаге методики (активное слушание, DESC, «заезженная пластинка»,
 * интересы вместо позиций, конкретный план). Данные — quests/<id>.json. Это учебная симуляция, не прогноз реакции живого человека. */
(function () {
  'use strict';
  const QUESTS = ['boss-feedback', 'refuse-colleague', 'mom-boundaries', 'apology-friend'];
  const META = {
    'boss-feedback': { title: 'Разговор с начальником', tag: 'КВЕСТ · 6 ШАГОВ · 2 СТИЛЯ', desc: 'Трудная обратная связь. Неудачный ответ оставляет на месте, удачный пускает дальше и называет приём, на котором он держится.', em: 'Тренажёр разговора' },
    'refuse-colleague': { title: 'Сказать «нет» коллеге', tag: 'КВЕСТ · 5 ШАГОВ · 2 СТИЛЯ', desc: 'Отказать на просьбу о выходных так, чтобы не поссориться: пауза, спокойное «нет», держать решение, предложить своё.', em: 'Границы на работе' },
    'mom-boundaries': { title: 'Разговор с мамой о границах', tag: 'КВЕСТ · 5 ШАГОВ · 2 СТИЛЯ', desc: 'Сохранить близость и право решать самому: признать чувства, сказать «я», договориться о понятном ритме.', em: 'Границы в семье' },
    'apology-friend': { title: 'Извиниться и починить', tag: 'КВЕСТ · 5 ШАГОВ · 2 СТИЛЯ', desc: 'Подвели близкого человека. Как извиниться конкретно, выслушать и предложить, что исправите.', em: 'Конфликт и примирение' }
  };
  const KEY = id => 'ryadom-quest-' + id;
  const cache = {};
  let Q = null, S = null;
  const $ = s => document.querySelector(s);
  const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const fill = (t, s) => String(t || '').replace(/\{name\}/g, s ? s.name : 'Саша');

  function loadQuest(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return fetch('quests/' + id + '.json').then(r => { if (!r.ok) throw new Error('http'); return r.json(); }).then(j => (cache[id] = j));
  }
  const readDone = id => { try { const x = JSON.parse(localStorage.getItem(KEY(id)) || '{}'); return Array.isArray(x.done) ? x.done : []; } catch { return []; } };
  function markDone(id, variant) { try { const d = readDone(id); if (!d.includes(variant)) d.push(variant); localStorage.setItem(KEY(id), JSON.stringify({ done: d })); } catch { /* */ } renderCards(); }

  /* ---------- рисование ---------- */
  const SK = { hero: '#e8bf9c', b1: '#d9a882', b2: '#e2b894' };
  function face(expr, look, tense) {
    const E = {
      neutral: { bl: [-16, -9, -9, -9], br: [9, -9, 16, -9], m: 'M-7 14 L7 14' },
      calm: { bl: [-16, -9, -6, -10], br: [6, -10, 16, -9], m: 'M-8 12 Q0 18 8 12' },
      tense: { bl: [-16, -8, -5, -13], br: [5, -13, 16, -8], m: 'M-7 15 Q0 11 7 15' },
      stern: { bl: [-16, -13, -4, -8], br: [4, -8, 16, -13], m: 'M-8 14 L8 14' },
      impatient: { bl: [-16, -14, -4, -8], br: [4, -9, 16, -9], m: 'M-8 15 Q0 12 8 14' },
      listening: { bl: [-16, -11, -5, -12], br: [5, -12, 16, -11], m: 'M-5 14 Q0 16 5 14' },
      softened: { bl: [-16, -10, -5, -11], br: [5, -11, 16, -10], m: 'M-8 12 Q0 18 8 12' },
      smile: { bl: [-16, -11, -5, -12], br: [5, -12, 16, -11], m: 'M-10 10 Q0 21 10 10' }
    }[expr] || { bl: [-16, -9, -9, -9], br: [9, -9, 16, -9], m: 'M-7 14 L7 14' };
    const l = look || 0;
    const brow = b => '<line x1="' + b[0] + '" y1="' + b[1] + '" x2="' + b[2] + '" y2="' + b[3] + '"/>';
    return '<g stroke="#3a2e28" stroke-width="2.6" stroke-linecap="round" fill="none">' + brow(E.bl) + brow(E.br) + '<path d="' + E.m + '"/></g>' +
      '<g fill="#2b211c"><ellipse cx="' + (-10 + l) + '" cy="0" rx="3" ry="3.6"/><ellipse cx="' + (10 + l) + '" cy="0" rx="3" ry="3.6"/></g>' +
      (tense ? '<path d="M27 -14 q4 7 0 11 q-4 -4 0 -11z" fill="#9ed0e6" opacity=".9"/>' : '');
  }
  function hair(style, col) {
    if (style === 'bun') return '<g fill="' + col + '"><path d="M-30 -2 Q-34 -38 0 -38 Q34 -38 30 -2 Q22 -22 0 -20 Q-22 -22 -30 -2Z"/><circle cx="0" cy="-42" r="13"/><path d="M-30 -4 q-4 24 8 34 q-6 -18 0 -30z M30 -4 q4 24 -8 34 q6 -18 0 -30z"/></g>';
    return '<g fill="' + col + '"><path d="M-30 -4 Q-33 -38 0 -38 Q33 -38 30 -4 Q20 -22 0 -19 Q-20 -22 -30 -4Z"/></g>';
  }
  function person(o) {
    const c = o.c;
    const torso = o.suit === 'blazer'
      ? '<path d="M-40 -190 Q0 -204 40 -190 L44 -88 L-44 -88Z" fill="' + c.top + '"/><path d="M-12 -196 L0 -150 L12 -196Z" fill="' + c.under + '"/><path d="M0 -150 L-16 -100 M0 -150 L16 -100" stroke="#00000022" stroke-width="2"/>'
      : '<path d="M-40 -190 Q0 -204 40 -190 L44 -88 L-44 -88Z" fill="' + c.top + '"/>' + (c.vest ? '<path d="M-24 -192 L0 -200 L24 -192 L22 -92 L-22 -92Z" fill="' + c.vest + '"/><path d="M-9 -198 L0 -176 L9 -198Z" fill="#f6f2ea"/><path d="M0 -178 L-5 -120 L0 -108 L5 -120Z" fill="' + c.tie + '"/>' : '');
    return '<g transform="translate(' + o.x + ' ' + o.y + ') scale(' + (o.s || 1) + ')">' +
      '<ellipse cx="0" cy="2" rx="46" ry="7" fill="#0000001c"/>' +
      (o.legs === false ? '' : '<rect x="-26" y="-92" width="21" height="90" rx="9" fill="' + c.pants + '"/><rect x="5" y="-92" width="21" height="90" rx="9" fill="' + c.pants + '"/><rect x="-30" y="-6" width="27" height="9" rx="4" fill="#2d2a2b"/><rect x="3" y="-6" width="27" height="9" rx="4" fill="#2d2a2b"/>') +
      '<rect x="-56" y="-186" width="17" height="86" rx="8" fill="' + c.top + '" transform="rotate(4 -48 -186)"/><rect x="39" y="-186" width="17" height="86" rx="8" fill="' + c.top + '" transform="rotate(-4 48 -186)"/>' +
      '<circle cx="-50" cy="-96" r="9" fill="' + o.skin + '"/><circle cx="50" cy="-96" r="9" fill="' + o.skin + '"/>' +
      torso + '<rect x="-9" y="-212" width="18" height="22" rx="7" fill="' + o.skin + '"/>' +
      '<g transform="translate(0 -230)"><circle r="29" fill="' + o.skin + '"/>' + hair(o.hair, o.hc) + '<g class="qz-face" transform="translate(0 4)">' + face(o.expr, o.look, o.tense) + '</g></g></g>';
  }
  const HERO = { top: '#315f4c', pants: '#4a5560' };
  const BOSS = { direct: { top: '#e9eef2', vest: '#3d4f66', tie: '#c2765a', pants: '#2f3844' }, evasive: { top: '#7a5c7e', under: '#f6f0e6', pants: '#3b3440' } };

  function defs() {
    return '<defs><linearGradient id="qzWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5ede0"/><stop offset="1" stop-color="#e6d9c4"/></linearGradient>' +
      '<linearGradient id="qzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfdcd6"/><stop offset="1" stop-color="#f7efdf"/></linearGradient>' +
      '<linearGradient id="qzFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4c6ae"/><stop offset="1" stop-color="#bfae92"/></linearGradient>' +
      '<linearGradient id="qzBeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8e6" stop-opacity=".55"/><stop offset="1" stop-color="#fff8e6" stop-opacity="0"/></linearGradient></defs>';
  }
  function city(x, y, w, h) {
    let s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="url(#qzSky)"/>';
    const b = [[0, 90, 40, '#a9c4bb'], [34, 60, 36, '#8fb0a5'], [66, 105, 44, '#b6cdc3'], [104, 50, 38, '#93b3a8'], [140, 85, 46, '#a9c4bb'], [180, 65, 40, '#8fb0a5']];
    b.forEach(a => { const bh = a[1] * (h / 140); s += '<rect x="' + (x + a[0] * (w / 220)) + '" y="' + (y + h - bh) + '" width="' + (a[2] * (w / 220)) + '" height="' + bh + '" fill="' + a[3] + '"/>'; });
    return s + '<circle cx="' + (x + w * 0.2) + '" cy="' + (y + h * 0.25) + '" r="16" fill="#fff6dc" opacity=".85"/>';
  }
  function clock(cx, cy, hand) {
    return '<g><circle cx="' + cx + '" cy="' + cy + '" r="22" fill="#fffdf9" stroke="#8c6548" stroke-width="4"/><line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - 14) + '" stroke="#3a2e28" stroke-width="3" stroke-linecap="round"/><line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + 9) + '" y2="' + (cy + 4) + '" stroke="#c2765a" stroke-width="3" stroke-linecap="round" class="qz-hand"/></g>';
  }
  function corridorScene() {
    return '<svg viewBox="0 0 800 420" role="img" aria-label="Коридор перед кабинетом начальника" class="qz-svg">' + defs() +
      '<rect width="800" height="420" fill="url(#qzWall)"/><rect y="372" width="800" height="48" fill="url(#qzFloor)"/><rect y="366" width="800" height="8" fill="#f9f3e8"/>' +
      '<g><rect x="40" y="70" width="190" height="210" rx="6" fill="#fffdf9" stroke="#e0d4bf" stroke-width="6"/>' + city(50, 80, 170, 190) + '<line x1="135" y1="80" x2="135" y2="270" stroke="#fffdf9" stroke-width="6"/><line x1="50" y1="175" x2="220" y2="175" stroke="#fffdf9" stroke-width="6"/></g>' +
      '<polygon points="60,372 230,372 330,420 30,420" fill="url(#qzBeam)"/>' +
      '<g><rect x="540" y="112" width="180" height="262" rx="4" fill="#b99872"/><rect x="556" y="128" width="148" height="110" rx="3" fill="#a9855d"/><rect x="556" y="250" width="148" height="110" rx="3" fill="#a9855d"/><circle cx="692" cy="260" r="8" fill="#f1d98b"/><rect x="590" y="82" width="80" height="22" rx="4" fill="#fffdf9" stroke="#8c6548" stroke-width="2"/><text x="630" y="98" text-anchor="middle" font-size="13" font-family="system-ui,sans-serif" fill="#3a2e28" font-weight="700">Кабинет 3</text></g>' +
      clock(420, 120) +
      '<g><rect x="330" y="330" width="140" height="14" rx="5" fill="#8c6548"/><rect x="340" y="344" width="8" height="28" fill="#6f5139"/><rect x="452" y="344" width="8" height="28" fill="#6f5139"/></g>' +
      '<g id="qzHero" class="qz-actor">' + person({ x: 330, y: 394, s: 1.14, skin: SK.hero, hair: 'short', hc: '#5b4636', c: HERO, expr: 'tense', look: 4, tense: true }) + '<g transform="translate(392 276) rotate(-8)"><rect width="46" height="58" rx="3" fill="#fffdf9" stroke="#d9cfbd"/><line x1="8" y1="14" x2="38" y2="14" stroke="#c2765a" stroke-width="2.5"/><line x1="8" y1="26" x2="30" y2="26" stroke="#c2765a" stroke-width="2.5"/><line x1="8" y1="38" x2="36" y2="38" stroke="#9aa89f" stroke-width="2.5"/></g></g></svg>';
  }
  function npcOf(variant, look) {
    if (look) return { skin: look.skin || SK.b1, hair: look.style || 'short', hc: look.hair || '#37363b', suit: look.suit, c: { top: look.top || '#7a8aa0', vest: look.vest, tie: look.tie, under: look.under || '#f6f0e6', pants: look.pants || '#2f3844' } };
    return variant === 'evasive'
      ? { skin: SK.b2, hair: 'bun', hc: '#6b4a3a', c: BOSS.evasive, suit: 'blazer' } : { skin: SK.b1, hair: 'short', hc: '#37363b', c: BOSS.direct };
  }
  function heroG() { return '<g id="qzHero" class="qz-actor" style="transform:translateX(0px)">' + person({ x: 112, y: 400, s: 1.16, skin: SK.hero, hair: 'short', hc: '#5b4636', c: HERO, expr: 'tense', look: 4, tense: true }) + '</g>'; }
  function npcG(variant, look) { return '<g id="qzBoss" class="qz-actor qz-bob">' + person(Object.assign({ x: 628, y: 354, s: 1.04, expr: 'neutral', look: -4, legs: false }, npcOf(variant, look))) + '</g>'; }
  function kitchenScene(variant, look) {
    return '<svg viewBox="0 0 800 420" role="img" aria-label="Кухня: стол, чай, пирог, окно" class="qz-svg">' + defs() +
      '<rect width="800" height="420" fill="#f3e6d2"/><rect id="qzAura" width="800" height="420" fill="#c2765a" opacity="0"/>' +
      '<rect y="372" width="800" height="48" fill="url(#qzFloor)"/><rect y="366" width="800" height="8" fill="#f9f3e8"/>' +
      '<g><rect x="520" y="52" width="230" height="200" rx="6" fill="#fffdf9" stroke="#e0d4bf" stroke-width="7"/>' + city(530, 62, 210, 180) + '<line x1="635" y1="62" x2="635" y2="242" stroke="#fffdf9" stroke-width="7"/><path d="M510 46 q20 80 0 210 h36 q-18 -120 0 -210z M760 46 q-20 80 0 210 h-36 q18 -120 0 -210z" fill="#d89a80" opacity=".9"/></g>' +
      '<g><rect x="30" y="60" width="210" height="60" rx="5" fill="#b99872"/><line x1="135" y1="60" x2="135" y2="120" stroke="#8c6548" stroke-width="3"/><circle cx="125" cy="90" r="4" fill="#f1d98b"/><circle cx="145" cy="90" r="4" fill="#f1d98b"/><rect x="30" y="150" width="210" height="10" fill="#8c6548"/>' +
      [['#c2765a', 44], ['#4f8a76', 82], ['#e9d8b4', 120], ['#7a5c7e', 158], ['#b5876d', 196]].map(b => '<rect x="' + b[1] + '" y="124" width="26" height="26" rx="5" fill="' + b[0] + '"/>').join('') + '</g>' +
      '<g><rect x="36" y="196" width="140" height="178" rx="6" fill="#fffdf9" stroke="#d9cfbd" stroke-width="3"/><line x1="36" y1="270" x2="176" y2="270" stroke="#d9cfbd" stroke-width="3"/><rect x="160" y="214" width="6" height="40" rx="3" fill="#c9bfae"/><rect x="160" y="290" width="6" height="50" rx="3" fill="#c9bfae"/></g>' +
      clock(300, 96) +
      npcG(variant, look) +
      '<g><rect x="360" y="276" width="420" height="16" rx="6" fill="#e9d8b4"/><path d="M372 292 h396 v22 q-24 12 -48 0 q-24 12 -48 0 q-24 12 -48 0 q-24 12 -48 0 q-24 12 -48 0 q-24 12 -48 0 q-24 12 -48 0 q-24 12 -48 0z" fill="#d89a80"/><rect x="380" y="314" width="8" height="58" fill="#8c6548"/><rect x="752" y="314" width="8" height="58" fill="#8c6548"/></g>' +
      '<g><ellipse cx="470" cy="270" rx="34" ry="8" fill="#fffdf9" stroke="#d9cfbd"/><path d="M440 268 q2 -22 30 -22 q28 0 30 22z" fill="#d6a56a"/><path d="M452 258 q18 -10 36 0" stroke="#fff3d6" stroke-width="3" fill="none"/>' +
      '<rect x="560" y="246" width="40" height="28" rx="8" fill="#7c9a8a"/><path d="M600 252 q18 0 14 12 q-2 6 -14 6" fill="none" stroke="#7c9a8a" stroke-width="5"/><rect x="552" y="238" width="30" height="10" rx="4" fill="#7c9a8a"/>' +
      '<rect x="660" y="252" width="26" height="22" rx="5" fill="#f6f2ea" stroke="#d9cfbd"/><rect x="710" y="252" width="26" height="22" rx="5" fill="#f6f2ea" stroke="#d9cfbd"/></g>' +
      heroG() + '</svg>';
  }
  function cafeScene(variant, look) {
    return '<svg viewBox="0 0 800 420" role="img" aria-label="Кафе: столик у окна, чашки" class="qz-svg">' + defs() +
      '<rect width="800" height="420" fill="#efe4d2"/><rect id="qzAura" width="800" height="420" fill="#c2765a" opacity="0"/>' +
      '<rect y="372" width="800" height="48" fill="url(#qzFloor)"/><rect y="366" width="800" height="8" fill="#f9f3e8"/>' +
      '<g><rect x="40" y="40" width="360" height="240" rx="6" fill="#fffdf9" stroke="#e0d4bf" stroke-width="7"/>' + city(50, 50, 340, 220) + '<line x1="220" y1="50" x2="220" y2="270" stroke="#fffdf9" stroke-width="7"/><path d="M30 30 h380 l-14 30 h-352z" fill="#c2765a"/><path d="M30 30 h60 l-4 30 h-52z M150 30 h60 l-4 30 h-52z M270 30 h60 l-4 30 h-52z" fill="#fffdf9" opacity=".85"/></g>' +
      '<g><line x1="520" y1="0" x2="520" y2="60" stroke="#8c6548" stroke-width="3"/><path d="M496 60 q24 -26 48 0z" fill="#e0a33b"/><line x1="640" y1="0" x2="640" y2="76" stroke="#8c6548" stroke-width="3"/><path d="M616 76 q24 -26 48 0z" fill="#e0a33b"/><ellipse cx="520" cy="60" rx="30" ry="42" fill="url(#qzBeam)" opacity=".7"/></g>' +
      '<g><rect x="470" y="90" width="260" height="100" rx="6" fill="#2f3844"/><text x="600" y="128" text-anchor="middle" font-size="22" font-family="system-ui,sans-serif" fill="#f6f2ea" font-weight="700">МЕНЮ</text><line x1="500" y1="146" x2="700" y2="146" stroke="#f6f2ea" stroke-width="2" opacity=".6"/><line x1="500" y1="164" x2="660" y2="164" stroke="#f6f2ea" stroke-width="2" opacity=".6"/></g>' +
      '<g><path d="M30 372 h52 l-8 -60 h-36z" fill="#b5876d"/><path d="M56 312 q-34 -30 -14 -76 q18 28 14 76 M56 312 q34 -26 24 -74 q-26 24 -24 74 M56 312 q-6 -44 10 -84 q-2 46 -10 84" fill="#4f8a76"/></g>' +
      npcG(variant, look) +
      '<g><rect x="360" y="272" width="420" height="16" rx="8" fill="#b98c66"/><rect x="560" y="288" width="12" height="84" fill="#6f5139"/><rect x="520" y="366" width="92" height="8" rx="4" fill="#6f5139"/></g>' +
      '<g><ellipse cx="470" cy="268" rx="26" ry="6" fill="#fffdf9" stroke="#d9cfbd"/><path d="M450 266 q0 -22 20 -22 q20 0 20 22z" fill="#fffdf9" stroke="#d9cfbd"/><path d="M455 252 h30" stroke="#8c6548" stroke-width="3"/><path d="M490 252 q14 0 10 10 q-2 5 -10 5" fill="none" stroke="#d9cfbd" stroke-width="4"/>' +
      '<ellipse cx="690" cy="268" rx="26" ry="6" fill="#fffdf9" stroke="#d9cfbd"/><path d="M670 266 q0 -22 20 -22 q20 0 20 22z" fill="#fffdf9" stroke="#d9cfbd"/><path d="M675 252 h30" stroke="#8c6548" stroke-width="3"/><rect x="590" y="252" width="38" height="20" rx="4" fill="#fffdf9" stroke="#d9cfbd"/><line x1="598" y1="258" x2="620" y2="258" stroke="#c2765a" stroke-width="2"/></g>' +
      heroG() + '</svg>';
  }
  function roomScene(stage, variant, look) {
    if (stage === 'corridor') return corridorScene();
    if (stage === 'kitchen') return kitchenScene(variant, look);
    if (stage === 'cafe') return cafeScene(variant, look);
    return officeScene(variant, look);
  }
  function officeScene(variant, look) {
    const boss = npcOf(variant, look);
    return '<svg viewBox="0 0 800 420" role="img" aria-label="Кабинет начальника: стол, окно, бумаги" class="qz-svg">' + defs() +
      '<rect width="800" height="420" fill="url(#qzWall)"/>' +
      '<rect id="qzAura" width="800" height="420" fill="#c2765a" opacity="0"/>' +
      '<rect y="372" width="800" height="48" fill="url(#qzFloor)"/><rect y="366" width="800" height="8" fill="#f9f3e8"/>' +
      '<g><rect x="520" y="46" width="250" height="228" rx="6" fill="#fffdf9" stroke="#e0d4bf" stroke-width="7"/>' + city(530, 56, 230, 208) + '<line x1="645" y1="56" x2="645" y2="264" stroke="#fffdf9" stroke-width="7"/><line x1="530" y1="160" x2="760" y2="160" stroke="#fffdf9" stroke-width="7"/></g>' +
      '<polygon points="480,372 720,372 640,420 330,420" fill="url(#qzBeam)"/>' +
      '<g><rect x="36" y="62" width="150" height="250" rx="5" fill="#a67c5b"/><rect x="46" y="72" width="130" height="110" fill="#8c6548"/><rect x="46" y="190" width="130" height="112" fill="#8c6548"/>' +
      [['#c2765a', 52, 22], ['#315f4c', 76, 18], ['#e9d8b4', 96, 24], ['#7a5c7e', 122, 16], ['#4f8a76', 140, 26]].map(b => '<rect x="' + b[1] + '" y="' + (182 - 78) + '" width="' + b[2] + '" height="78" rx="2" fill="' + b[0] + '"/>').join('') +
      [['#5f7f9a', 52, 20], ['#c2765a', 74, 28], ['#e9d8b4', 104, 18], ['#315f4c', 124, 22], ['#b5876d', 148, 20]].map(b => '<rect x="' + b[1] + '" y="' + (302 - 78) + '" width="' + b[2] + '" height="78" rx="2" fill="' + b[0] + '"/>').join('') + '</g>' +
      clock(300, 96) +
      '<g><path d="M740 372 h40 l-6 -46 h-28z" fill="#b5876d"/><path d="M760 326 q-30 -24 -12 -60 q16 22 12 60 M760 326 q28 -20 20 -58 q-22 18 -20 58 M760 326 q-4 -34 8 -66 q-2 36 -8 66" fill="#4f8a76"/></g>' +
      '<g id="qzBoss" class="qz-actor qz-bob">' + person(Object.assign({ x: 628, y: 354, s: 1.04, expr: 'neutral', look: -4, legs: false }, boss)) + '</g>' +
      '<g><rect x="385" y="272" width="395" height="18" rx="6" fill="#b98c66"/><rect x="396" y="290" width="373" height="86" rx="4" fill="#8c6548"/><rect x="400" y="296" width="170" height="70" rx="3" fill="#7d5a3f"/><rect x="580" y="296" width="170" height="70" rx="3" fill="#7d5a3f"/></g>' +
      '<g><rect x="480" y="258" width="64" height="16" rx="2" fill="#fffdf9" stroke="#d9cfbd"/><line x1="488" y1="263" x2="528" y2="263" stroke="#c2765a" stroke-width="2"/><line x1="488" y1="268" x2="516" y2="268" stroke="#c2765a" stroke-width="2"/><rect x="408" y="236" width="52" height="36" rx="4" fill="#2f3844"/><rect x="412" y="240" width="44" height="26" rx="2" fill="#bcd8d2"/><rect x="430" y="272" width="8" height="6" fill="#2f3844"/><rect x="700" y="252" width="22" height="22" rx="5" fill="#f6f2ea" stroke="#d9cfbd"/><path d="M722 258 q9 3 0 12" fill="none" stroke="#d9cfbd" stroke-width="3"/></g>' +
      '<g id="qzHero" class="qz-actor" style="transform:translateX(0px)">' + person({ x: 112, y: 400, s: 1.16, skin: SK.hero, hair: 'short', hc: '#5b4636', c: HERO, expr: 'tense', look: 4, tense: true }) + '</g></svg>';
  }

  /* ---------- состояние и отрисовка ---------- */
  const HERO_X = [0, 24, 50, 80, 110, 140];   // сдвиг героя к столу по шагам
  function heroX(pos) { return HERO_X[Math.min(pos || 0, HERO_X.length - 1)]; }
  function seedShuffle(arr, seed) { const a = arr.slice(); let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const hash = str => { let x = 2166136261; for (const ch of String(str)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

  function root() { const r = $('#gamePlay'); $('#gamesHub').hidden = true; r.hidden = false; r.className = 'qz'; return r; }
  function back() { const r = $('#gamePlay'); r.hidden = true; r.replaceChildren(); $('#gamesHub').hidden = false; window.scrollTo(0, 0); }
  function topBar(r) { const t = h('div', 'qz-top'); const b = h('button', null, '← К играм'); b.type = 'button'; b.onclick = back; t.append(b, h('span', null, Q.kicker)); r.append(t); }

  function renderIntro() {
    const r = root(); r.replaceChildren(); topBar(r);
    const w = h('div', 'qz-intro'); w.append(h('span', 'qz-kicker', Q.kicker), h('h2', null, Q.intro.title));
    Q.intro.paragraphs.forEach(p => w.append(h('p', null, p)));
    const setup = h('div', 'qz-setup');
    const lab = h('label', null, 'Как тебя зовут в этой истории?'); lab.htmlFor = 'qzName'; const inp = h('input'); inp.id = 'qzName'; inp.maxLength = 20; inp.placeholder = 'Саша'; inp.value = (S && S.name) || '';
    setup.append(lab, inp, h('p', 'qz-q', Q.pick || 'Какой начальник?'));
    const grid = h('div', 'qz-variants'); let chosen = (S && S.variant) || Q.variants[0].id; const done = readDone(Q.id);
    Q.variants.forEach(v => {
      const b = h('button', 'qz-variant' + (v.id === chosen ? ' on' : '')); b.type = 'button'; b.setAttribute('aria-pressed', v.id === chosen ? 'true' : 'false');
      b.append(h('b', null, v.name), h('small', null, v.boss.name + (done.includes(v.id) ? ' · пройдено' : '')), h('span', null, v.desc));
      b.onclick = () => { chosen = v.id; grid.querySelectorAll('.qz-variant').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); };
      grid.append(b);
    });
    setup.append(grid);
    const go = h('button', 'qz-next', 'Начать →'); go.type = 'button'; go.onclick = () => start(inp.value.trim().slice(0, 20) || 'Саша', chosen);
    setup.append(go); w.append(setup, h('p', 'qz-note', Q.intro.note), h('p', 'qz-note', Q.intro.disclaimer)); r.append(w);
  }
  function start(name, variant) { S = { name, variant, i: 0, phase: 'ask', fails: {}, tension: 2, path: [], firsts: 0, tried: {}, picked: null, shown: false }; render(true); }
  const nodeOf = () => Q.nodes[S.i];
  const varOf = () => Q.variants.find(v => v.id === S.variant);
  const bossName = () => varOf().boss.name;

  let stageKey = '', refs = {};
  function setFace(g, expr, look, tense) { const f = g && g.querySelector('.qz-face'); if (f) f.innerHTML = face(expr, look, tense); }
  function syncStage(n) {
    const key = n.stage;
    if (key !== stageKey) {
      stageKey = key; refs.host.innerHTML = roomScene(key, S.variant, varOf().boss.look);
      refs.host.classList.remove('in'); void refs.host.offsetWidth; refs.host.classList.add('in');
    }
    const hero = refs.host.querySelector('#qzHero'), boss = refs.host.querySelector('#qzBoss'), aura = refs.host.querySelector('#qzAura');
    if (hero && n.stage !== 'corridor') hero.style.transform = 'translateX(' + heroX(n.pos) + 'px)';
    if (aura) aura.setAttribute('opacity', String(Math.max(0, S.tension - 1) * 0.05));
    return { hero, boss };
  }

  function render(first) {
    const n = nodeOf(); const r = root();
    if (first || !refs.shell || !r.contains(refs.shell)) {
      r.replaceChildren(); topBar(r);
      const shell = h('div', 'qz-shell'), stage = h('div', 'qz-stage'), host = h('div', 'qz-host'), meter = h('div', 'qz-meter'), panel = h('div', 'qz-panel');
      stage.append(host, meter); shell.append(stage, panel); r.append(shell); refs = { shell, host, meter, panel }; stageKey = '';
    }
    const a = syncStage(n);
    // выражения
    const bossLine = n.boss ? n.boss[S.variant] : null; let bExpr = bossLine ? bossLine.expr : 'neutral'; let hExpr = n.heroExpr || 'calm';
    if (S.phase === 'react' && S.reaction && S.reaction.expr) bExpr = S.reaction.expr;
    if (S.phase === 'react' && S.reaction && S.reaction.fail) hExpr = 'down';
    if (S.phase === 'react' && S.reaction && !S.reaction.fail) hExpr = 'calm';
    setFace(a.hero, hExpr, 4, hExpr === 'tense' || (S.reaction && S.reaction.fail));
    setFace(a.boss, bExpr, -4, false);
    if (S.reaction && S.reaction.fail && a.hero) { a.hero.classList.remove('qz-shake'); void a.hero.getBoundingClientRect(); a.hero.classList.add('qz-shake'); }
    // шкалы
    refs.meter.replaceChildren();
    const steps = h('div', 'qz-steps'); steps.setAttribute('aria-label', 'Шаг ' + (S.i + 1) + ' из ' + Q.nodes.length);
    Q.nodes.forEach((_, k) => steps.append(h('i', k < S.i ? 'done' : k === S.i ? 'now' : '')));
    const ten = h('div', 'qz-tension'); ten.append(h('span', null, 'Напряжение'));
    for (let k = 1; k <= 5; k++) ten.append(h('b', k <= S.tension ? 'on' : ''));
    refs.meter.append(h('span', 'qz-step', 'Шаг ' + (S.i + 1) + ' / ' + Q.nodes.length), steps, ten);
    // панель
    const p = refs.panel; p.replaceChildren();
    const talk = h('div', 'qz-talk');
    if (bossLine && S.phase !== 'react') { const b = h('div', 'qz-bubble boss'); b.append(h('b', null, bossName()), h('p', null, fill(bossLine.say, S))); talk.append(b); }
    talk.append(h('p', 'qz-narr', fill(n.narr, S))); p.append(talk);
    if (S.phase === 'ask') renderAsk(p, n); else if (S.phase === 'react') renderReact(p, n);
  }

  function renderAsk(p, n) {
    p.append(h('h3', 'qz-ask', n.ask));
    const opts = seedShuffle(n.options, hash(n.id + S.variant));
    const fails = S.fails[n.id] || 0; const tried = S.tried[n.id] || [];
    const box = h('div', 'qz-options'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', n.ask);
    opts.forEach(o => {
      const b = h('button', 'qz-opt' + (S.showAnswer === n.id && o.quality !== 'bad' ? ' glow' : '')); b.type = 'button';
      b.append(h('span', null, '«' + fill(o.text, S) + '»'));
      if (tried.includes(o.id)) { b.disabled = true; b.classList.add('tried'); b.append(h('small', null, 'Уже пробовали — не сработало')); }
      b.onclick = () => choose(n, o); box.append(b);
    });
    p.append(box);
    if (fails >= 2) p.append(h('p', 'qz-hint', 'Подсказка: ' + n.hint));
    if (fails >= 3 && S.showAnswer !== n.id) { const b = h('button', 'qz-ghost', 'Показать подходящие варианты'); b.type = 'button'; b.onclick = () => { S.showAnswer = n.id; render(); }; p.append(b); }
  }
  function choose(n, o) {
    const pass = o.quality !== 'bad'; const react = o.react[S.variant] || o.react;
    S.picked = o; S.phase = 'react';
    const dx = varOf().boss.expr || {};
    S.reaction = { say: react.say || null, narr: react.narr || null, expr: react.expr || (pass ? (o.quality === 'ok' ? dx.soft : dx.good) : dx.fail), fail: !pass, quality: o.quality };
    if (pass) { S.tension = Math.max(0, S.tension - 1); if (!(S.fails[n.id] > 0)) S.firsts++; S.path.push({ node: n, opt: o }); }
    else { S.tension = Math.min(5, S.tension + 1); S.fails[n.id] = (S.fails[n.id] || 0) + 1; (S.tried[n.id] = S.tried[n.id] || []).push(o.id); }
    render();
  }
  function renderReact(p, n) {
    const o = S.picked, rc = S.reaction;
    const you = h('div', 'qz-bubble you'); you.append(h('b', null, S.name), h('p', null, '«' + fill(o.text, S) + '»')); p.append(you);
    if (rc.say) { const b = h('div', 'qz-bubble boss'); b.append(h('b', null, bossName()), h('p', null, fill(rc.say, S))); p.append(b); }
    if (rc.narr) p.append(h('p', 'qz-narr', rc.narr));
    const fb = h('div', 'qz-feedback ' + (rc.fail ? 'fail' : rc.quality === 'ok' ? 'ok' : 'good')); fb.setAttribute('aria-live', 'polite');
    fb.append(h('b', null, rc.fail ? 'Остаёшься на месте' : rc.quality === 'ok' ? 'Проходишь дальше — можно сильнее' : 'Проходишь дальше'));
    fb.append(h('p', null, o.why));
    if (!rc.fail) { const t = n.tech; const card = h('div', 'qz-tech'); card.append(h('span', 'qz-tag', 'ПРИЁМ'), h('b', null, t.name), h('p', null, t.text), h('small', null, 'Источник: ' + t.src)); fb.append(card); }
    p.append(fb);
    const btn = h('button', 'qz-next', rc.fail ? 'Попробовать ещё раз' : (S.i === Q.nodes.length - 1 ? 'Завершить разговор →' : 'Дальше →')); btn.type = 'button';
    btn.onclick = () => { if (rc.fail) { S.phase = 'ask'; S.reaction = null; render(); } else if (S.i === Q.nodes.length - 1) { S.phase = 'end'; renderEnd(); } else { S.i++; S.phase = 'ask'; S.reaction = null; S.showAnswer = null; render(); } };
    p.append(btn);
  }

  function renderEnd() {
    const r = root(); r.replaceChildren(); topBar(r); stageKey = ''; refs = {};
    markDone(Q.id, S.variant);
    const F = Q.finale, wrap = h('div', 'qz-end');
    const stage = h('div', 'qz-stage qz-host in'); const lastStage = Q.nodes[Q.nodes.length - 1].stage; stage.innerHTML = roomScene(lastStage, S.variant, varOf().boss.look);
    const hero = stage.querySelector('#qzHero'), boss = stage.querySelector('#qzBoss');
    if (hero) hero.style.transform = 'translateX(140px)'; setFace(hero, 'smile', 4, false); setFace(boss, F.boss[S.variant].expr, -4, false);
    const bub = h('div', 'qz-bubble boss'); bub.append(h('b', null, bossName()), h('p', null, F.boss[S.variant].say));
    wrap.append(stage, h('span', 'qz-kicker', 'ГОТОВО'), h('h2', null, F.title), bub, h('p', 'qz-lead', F.lead));
    const ul = h('ul', 'qz-path'); S.path.forEach(x => { const li = h('li'); li.append(h('b', null, x.node.tech.name), h('span', null, '«' + fill(x.opt.text, S) + '»')); ul.append(li); });
    wrap.append(ul, h('p', 'qz-stat', 'С первой попытки получилось на шагах: ' + S.firsts + ' из ' + Q.nodes.length + '. Это не оценка: ошибки в тренировке нужны, чтобы увидеть, как реагирует разговор.'));
    const carry = h('div', 'qz-carry'); carry.append(h('h3', null, 'Что взять в жизнь')); const cu = h('ul'); F.carry.forEach(c => cu.append(h('li', null, c))); carry.append(cu); wrap.append(carry);
    const mine = h('div', 'qz-mine'); mine.append(h('label', null, F.prompt)); const ta = h('textarea'); ta.rows = 3; ta.maxLength = 400; ta.placeholder = 'Своими словами, коротко: что скажешь первым делом.'; ta.id = 'qzMine'; mine.lastChild.htmlFor = 'qzMine';
    const row = h('div', 'qz-actions'); const cp = h('button', 'qz-ghost', 'Скопировать'); cp.type = 'button'; const msg = h('span', 'qz-saved', '');
    cp.onclick = () => { const t = ta.value.trim(); if (!t) { msg.textContent = 'Сначала напиши свою версию.'; return; } try { navigator.clipboard.writeText(t).then(() => { msg.textContent = 'Скопировано.'; }, () => { msg.textContent = 'Скопируй текст вручную.'; }); } catch { msg.textContent = 'Скопируй текст вручную.'; } };
    row.append(cp);
    if (window.RyadomProfile && window.RyadomProfile._get().use) { const sv = h('button', 'qz-ghost', 'Запомнить в «Обо мне»'); sv.type = 'button'; sv.onclick = () => { const t = ta.value.trim(); if (!t) { msg.textContent = 'Сначала напиши свою версию.'; return; } msg.textContent = window.RyadomProfile.add('help', 'Моя фраза: ' + t, 'me') ? 'Записано в «Обо мне».' : 'Такая запись уже есть или список полон.'; }; row.append(sv); }
    row.append(msg); mine.append(ta, row); wrap.append(mine);
    const acts = h('div', 'qz-actions'); const again = h('button', 'qz-next', 'Другой стиль собеседника'); again.type = 'button'; again.onclick = () => { S = { name: S.name, variant: Q.variants.find(v => v.id !== S.variant).id }; renderIntro(); };
    const same = h('button', 'qz-ghost', 'Пройти заново'); same.type = 'button'; same.onclick = () => start(S.name, S.variant);
    const hub = h('button', 'qz-ghost', 'К играм'); hub.type = 'button'; hub.onclick = back; acts.append(again, same, hub); wrap.append(acts);
    r.append(wrap); window.scrollTo(0, 0);
  }

  /* ---------- карточки в разделе «Игры» ---------- */
  function renderCards() {
    const host = $('#qzCards'); if (!host) return; host.replaceChildren();
    QUESTS.forEach(id => {
      const m = META[id]; const done = readDone(id).length;
      const b = h('button', 'qz-card'); b.type = 'button';
      b.append(h('span', 'qz-card-tag', m.tag), h('b', null, m.title), h('p', null, m.desc), h('em', null, done ? 'Пройдено стилей: ' + done + ' из 2' : m.em));
      b.onclick = () => open(id); host.append(b);
    });
  }
  function open(id) { loadQuest(id).then(q => { Q = q; S = null; renderIntro(); }).catch(() => { const r = root(); r.replaceChildren(); topBar(r); r.append(h('p', 'qz-note', 'Не удалось загрузить квест. Проверь соединение и попробуй ещё раз.')); }); }
  function mount() {
    const grid = $('#gameGrid'); if (!grid) return;
    const sec = h('section', 'qz-section'); sec.append(h('h2', null, 'Тренажёры разговоров'), h('p', 'qz-sub', 'Квесты, где выбор слов меняет ход разговора. Опираются на известные методики общения.')); const cards = h('div', 'qz-cards'); cards.id = 'qzCards'; sec.append(cards);
    const anchor = grid.closest('details') || grid; anchor.before(sec); renderCards();
  }
  window.RyadomQuest = { open, _state: () => S, _quest: () => Q };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
