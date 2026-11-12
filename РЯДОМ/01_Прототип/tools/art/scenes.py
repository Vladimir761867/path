# Генератор векторных иллюстраций сцен «Рядом». Свой рисунок, единый стиль:
# мягкие формы, тёплый свет, без лиц в деталях — человек узнаёт себя в фигуре.
import os, math, random
W, H = 1600, 700
OUT = os.environ.get('OUT', '/tmp/claude-0/work/art/out')

def grad(id_, stops, x2=0, y2=1):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>'

def rgrad(id_, c, op=0.55):
    return f'<radialGradient id="{id_}"><stop offset="0" stop-color="{c}" stop-opacity="{op}"/><stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>'

def rect(x, y, w, h, fill, rx=0, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'

def circ(x, y, r, fill, extra=''):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" {extra}/>'

def path(d, fill, extra=''):
    return f'<path d="{d}" fill="{fill}" {extra}/>'

# ---------- люди ----------
SKIN = ['#e9c2a6', '#d7a07c', '#b9805c', '#8d5a3e', '#f0cfb6']
MODE = os.environ.get('MODE', 'full')
SPOTS = []
def slot(x, y, s=1.0, pose='sit', facing=1):
    SPOTS.append({'x': x, 'y': y, 's': s, 'pose': pose, 'facing': facing}); return ''

def person(x, y, s=1.0, pose='sit', top='#4f7a66', bottom='#38485a', hair='#3a2a22', skin=0, hairstyle='short', facing=1, hold=None):
    """x,y — точка сиденья (sit) или стоп (stand). facing 1 — вправо, -1 — влево."""
    if MODE == 'bg':
        SPOTS.append({'x': x, 'y': y, 's': s, 'pose': pose, 'facing': facing}); return ''
    k = s * 1.18; sk = SKIN[skin % len(SKIN)]
    fy = 0 if pose == 'stand' else 112
    g = [f'<ellipse cx="{x + (20 if pose != "stand" else 0) * k * facing}" cy="{y + fy * k}" rx="{70 * k}" ry="{10 * k}" fill="#1b2a24" opacity=".16"/>',
         f'<g transform="translate({x},{y}) scale({facing*k},{k})">']
    if pose == 'stand':
        hy = -330
        g.append(path('M-26,-150 L-30,0 L-6,0 L0,-120 L6,0 L30,0 L26,-150Z', bottom))
        g.append(rect(-34, -4, 30, 10, '#2a2f36', 5)); g.append(rect(4, -4, 30, 10, '#2a2f36', 5))
        g.append(path('M-46,-150 C-50,-215 -40,-262 0,-270 C40,-262 50,-215 46,-150Z', top))
        g.append(path('M40,-250 C58,-215 60,-180 52,-150', 'none', f'stroke="{top}" stroke-width="20" stroke-linecap="round"'))
        g.append(path('M-40,-250 C-58,-215 -60,-180 -52,-150', 'none', f'stroke="{top}" stroke-width="20" stroke-linecap="round"'))
        g.append(circ(54, -146, 10, sk)); g.append(circ(-54, -146, 10, sk))
    else:
        hy = -250
        g.append(path('M-30,-8 L56,-8 C70,-8 74,4 72,16 L66,110 L46,110 L48,22 L-30,22Z', bottom))
        g.append(rect(40, 104, 34, 10, '#2a2f36', 5))
        g.append(path('M-44,-6 C-50,-110 -40,-176 0,-186 C40,-176 50,-110 44,-6Z', top))
        g.append(path('M36,-160 C58,-120 66,-86 74,-64', 'none', f'stroke="{top}" stroke-width="20" stroke-linecap="round"'))
        g.append(circ(78, -60, 10, sk))
    g.append(rect(-9, hy + 50, 18, 26, sk, 6))
    g.append(circ(0, hy + 26, 34, sk))
    if hairstyle == 'long':
        g.append(path(f'M-36,{hy+24} C-40,{hy-16} -10,{hy-26} 8,{hy-14} C30,{hy-24} 44,{hy} 38,{hy+20} C44,{hy+60} 40,{hy+92} 30,{hy+110} L-34,{hy+112} C-46,{hy+84} -44,{hy+54} -36,{hy+24}Z', hair))
    elif hairstyle == 'bun':
        g.append(circ(-12, hy - 14, 18, hair))
        g.append(path(f'M-36,{hy+30} C-38,{hy-12} -6,{hy-20} 10,{hy-10} C32,{hy-14} 40,{hy+6} 36,{hy+24} C24,{hy+8} 0,{hy+4} -20,{hy+14}Z', hair))
    elif hairstyle == 'curly':
        for dx, dy, r in [(-24, 8, 16), (-6, -4, 18), (14, -2, 17), (30, 14, 14), (-32, 28, 13)]:
            g.append(circ(dx, hy + dy, r, hair))
    else:
        g.append(path(f'M-36,{hy+30} C-38,{hy-8} -8,{hy-14} 10,{hy-8} C34,{hy-8} 40,{hy+10} 36,{hy+26} C26,{hy+12} 4,{hy+8} -18,{hy+16} C-26,{hy+20} -30,{hy+30} -36,{hy+30}Z', hair))
    if hold == 'phone':
        g.append(rect(70, -96, 22, 38, '#1f2a33', 5)); g.append(rect(73, -92, 16, 28, '#bfe3ff', 3, 'opacity=".9"'))
    if hold == 'cup':
        g.append(rect(70, -82, 26, 28, '#f4efe6', 6))
    g.append('</g>')
    return ''.join(g)

def plant(x, y, s=1.0, pot='#c98e6b', leaf='#5d8a63'):
    out = [f'<g transform="translate({x},{y}) scale({s})">']
    for a, l in [(-40, 120), (-15, 150), (10, 140), (35, 115), (-60, 90), (55, 95)]:
        r = math.radians(a)
        ex, ey = math.sin(r) * l, -math.cos(r) * l
        out.append(path(f'M0,0 Q{ex*0.2-12},{ey*0.6} {ex},{ey} Q{ex*0.6+14},{ey*0.5} 0,0Z', leaf, 'opacity=".95"'))
    out.append(path('M-34,0 L34,0 L26,58 L-26,58Z', pot))
    out.append('</g>'); return ''.join(out)

def lamp_glow(x, y, r, c='#ffd79a', op=0.5, gid='glow'):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#{gid})" opacity="{op}"/>'

def window(x, y, w, h, sky, frame='#f4ede2', bars=True, extra=''):
    o = [rect(x - 12, y - 12, w + 24, h + 24, frame, 10), rect(x, y, w, h, sky, 4), extra]
    if bars:
        o.append(rect(x + w / 2 - 5, y, 10, h, frame)); o.append(rect(x, y + h * 0.45 - 5, w, 10, frame))
    o.append(rect(x - 24, y + h + 8, w + 48, 16, frame, 6))
    return ''.join(o)

def skyline(y, color, seed=1, x0=0, x1=W, minh=60, maxh=220):
    r = random.Random(seed); x = x0; o = []
    while x < x1:
        w = r.randint(50, 120); hgt = r.randint(minh, maxh)
        o.append(rect(x, y - hgt, w, hgt + 400, color))
        if r.random() < 0.6:
            for wy in range(int(y - hgt + 18), int(y) - 10, 30):
                for wx in range(x + 10, x + w - 12, 22):
                    if r.random() < 0.35: o.append(rect(wx, wy, 9, 13, '#ffe6a8', 1, 'opacity=".75"'))
        x += w + r.randint(0, 14)
    return ''.join(o)

def tree(x, y, s=1, c='#6f9a6b', trunk='#7a5a44'):
    return (f'<g transform="translate({x},{y}) scale({s})">' + rect(-9, -120, 18, 120, trunk, 6) +
            circ(0, -170, 80, c) + circ(-55, -130, 55, c) + circ(55, -135, 58, c) + circ(0, -110, 50, c, 'opacity=".9"') + '</g>')

def svg(defs, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="{title}">'
            f'<defs>{defs}{rgrad("glow", "#ffd79a")}{rgrad("glowc", "#bfe3ff", .6)}{rgrad("sun", "#fff1c9", .9)}'
            f'<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#0f241d" stop-opacity="0"/><stop offset="1" stop-color="#0f241d" stop-opacity=".28"/></linearGradient></defs>'
            f'{body}<rect width="{W}" height="{H}" fill="url(#shade)"/></svg>')

S = {}

# 1. Офис вечером
def office():
    d = grad('ow', [(0, '#e9e2d6'), (1, '#d9d0c1')]) + grad('osky', [(0, '#8fa9c7'), (1, '#f2b98f')])
    b = [rect(0, 0, W, H, 'url(#ow)'), window(980, 70, 520, 330, 'url(#osky)', bars=True,
         extra=f'<g clip-path="url(#ocl)">{skyline(400, "#6c7f96", 3, 980, 1500, 60, 200)}</g>'),
         rect(0, 520, W, 180, '#b9a68f'), rect(0, 512, W, 14, '#a8937b'),
         rect(150, 60, 300, 200, '#f6f1e8', 8), rect(170, 82, 120, 12, '#d9cbb6', 6), rect(170, 106, 220, 10, '#e6dccd', 5),
         *[rect(180 + i * 70, 140, 52, 52, c, 4) for i, c in enumerate(['#f7d97a', '#a8d5c2', '#f4b6a6', '#f7d97a'])],
         rect(420, 360, 640, 26, '#7c5b45', 6), rect(450, 386, 22, 150, '#6a4c39'), rect(1010, 386, 22, 150, '#6a4c39'),
         rect(610, 230, 250, 150, '#2b3640', 12), rect(622, 242, 226, 118, 'url(#glowscr)', 6), rect(720, 380, 50, 12, '#2b3640'),
         rect(520, 348, 60, 12, '#e9e0d1', 3), rect(890, 334, 40, 26, '#f4efe6', 6),
         lamp_glow(735, 300, 240, op=.45, gid='glowc'),
         person(560, 420, 1.0, 'sit', top='#5b7a99', bottom='#3a4a5c', hair='#2d2420', skin=0, hairstyle='bun'),
         slot(1180, 540, 1.0, 'stand', -1),
         rect(470, 420, 150, 18, '#4d5b67', 8), rect(530, 438, 14, 90, '#4d5b67'),
         plant(1250, 520, 1.0)]
    d += '<clipPath id="ocl"><rect x="980" y="70" width="520" height="330"/></clipPath>' + grad('glowscr', [(0, '#cfe8ff'), (1, '#8fb5d9')])
    return svg(d, ''.join(b), 'Офис вечером')
S['office'] = office

# 2. Парк днём
def park():
    d = grad('psky', [(0, '#bfe0ee'), (1, '#f7efd9')]) + grad('pgr', [(0, '#a9c99a'), (1, '#86ad7c')])
    b = [rect(0, 0, W, H, 'url(#psky)'), circ(1320, 120, 70, '#fff3cf'), lamp_glow(1320, 120, 260, op=.6, gid='sun'),
         path('M0,420 C300,360 600,400 900,380 C1200,360 1400,390 1600,370 L1600,700 L0,700Z', '#c4dbb0'),
         path('M0,470 C400,440 800,470 1600,440 L1600,700 L0,700Z', 'url(#pgr)'),
         path('M640,700 C700,600 820,520 1000,470 L1060,470 C900,540 820,620 820,700Z', '#e8dcc3'),
         tree(200, 470, 1.2), tree(420, 450, 0.9, '#7fa775'), tree(1400, 470, 1.3, '#6a9466'), tree(1200, 440, 0.8, '#86ad7c'),
         rect(470, 540, 330, 18, '#8a6a4f', 6), rect(470, 500, 330, 14, '#8a6a4f', 6), rect(490, 558, 14, 60, '#5d4a3a'), rect(766, 558, 14, 60, '#5d4a3a'),
         person(560, 545, 0.85, 'sit', top='#d98c6b', bottom='#3f4f5f', hair='#4a3426', skin=1, hairstyle='long'),
         person(700, 545, 0.85, 'sit', top='#5f8a74', bottom='#33414f', hair='#1f1a17', skin=3, hairstyle='short', facing=-1),
         slot(960, 610, .9, 'stand', -1),
         circ(1060, 600, 8, '#f3c25b'), circ(1090, 620, 6, '#f08b7a'), circ(300, 640, 7, '#f3c25b')]
    return svg(d, ''.join(b), 'Парк')
S['park'] = park

# 3. Ночь, спальня, телефон
def night():
    d = grad('nw', [(0, '#2c3a57'), (1, '#1f2a40')]) + grad('nsky', [(0, '#16213a'), (1, '#33476b')])
    stars = ''.join(circ(1030 + (i * 73) % 400, 100 + (i * 37) % 220, 2 + i % 2, '#fff', 'opacity=".8"') for i in range(14))
    b = [rect(0, 0, W, H, 'url(#nw)'), window(1000, 80, 440, 300, 'url(#nsky)', frame='#3d4d6a', extra=stars + circ(1340, 150, 34, '#f4ead0')),
         rect(0, 540, W, 160, '#1a2234'),
         rect(200, 400, 760, 150, '#3e4d6e', 30), rect(200, 330, 90, 220, '#4a5a7c', 20), rect(300, 380, 200, 60, '#d9dfef', 26, 'opacity=".85"'),
         path('M520,420 C620,390 820,400 940,430 L960,550 L500,550Z', '#56679a'),
         rect(1080, 430, 120, 120, '#33405c', 10), rect(1110, 380, 60, 50, '#e7c98f', 8, 'opacity=".9"'),
         person(700, 440, 1.0, 'sit', top='#8a7fb3', bottom='#4c5880', hair='#1b1513', skin=0, hairstyle='curly', hold='phone'),
         slot(1180, 540, .95, 'stand', -1),
         lamp_glow(780, 360, 160, op=.8, gid='glowc')]
    return svg(d, ''.join(b), 'Ночная комната')
S['night'] = night

# 4. Мастерская, плакат
def studio():
    d = grad('sw', [(0, '#f3e7d9'), (1, '#ead9c4')])
    b = [rect(0, 0, W, H, 'url(#sw)'), window(120, 60, 360, 300, '#cfe6ef', frame='#fbf6ee'),
         rect(0, 540, W, 160, '#c8ad8f'),
         rect(620, 90, 300, 400, '#fffaf2', 6, 'transform="rotate(-3 770 290)"'),
         circ(760, 230, 70, '#f19a77', 'transform="rotate(-3 770 290)"'), rect(660, 340, 200, 18, '#3e5a74', 4, 'transform="rotate(-3 770 290)"'),
         rect(660, 372, 140, 12, '#8aa9c2', 4, 'transform="rotate(-3 770 290)"'),
         rect(960, 160, 140, 180, '#fbe3c7', 6), rect(1120, 200, 120, 150, '#d6ebe1', 6),
         rect(520, 470, 760, 24, '#8c6b50', 6), rect(560, 494, 20, 100, '#6f523d'), rect(1220, 494, 20, 100, '#6f523d'),
         *[rect(1100 + i * 18, 400, 10, 70, c, 3) for i, c in enumerate(['#e76f51', '#2a9d8f', '#e9c46a', '#264653'])],
         rect(1080, 450, 120, 22, '#efe6d8', 6),
         path('M1300,470 L1340,300 L1360,300 L1330,470Z', '#4a4f57'), circ(1352, 290, 34, '#f7d48b'), lamp_glow(1352, 330, 200, op=.7),
         person(470, 560, 1.0, 'sit', top='#e2a54d', bottom='#43506a', hair='#5a3825', skin=2, hairstyle='long'),
         slot(1020, 570, 1.0, 'stand', -1),
         plant(1460, 540, .9)]
    return svg(d, ''.join(b), 'Мастерская')
S['studio'] = studio

# 5. Балкон на закате
def balcony():
    d = grad('bsky', [(0, '#f6b38f'), (.6, '#f9d9a8'), (1, '#fbe9c9')])
    b = [rect(0, 0, W, H, 'url(#bsky)'), circ(1180, 330, 90, '#fff0c4'), lamp_glow(1180, 330, 380, op=.7, gid='sun'),
         skyline(470, '#c98f7f', 7, 0, W, 60, 260), skyline(520, '#a8736b', 9, 0, W, 40, 180),
         rect(0, 520, W, 180, '#8e6b5c'), rect(0, 430, W, 14, '#4d4a52'),
         *[rect(40 + i * 60, 444, 8, 90, '#4d4a52') for i in range(27)],
         rect(0, 530, W, 14, '#4d4a52'),
         plant(160, 520, 1.1, leaf='#4f7a58'), plant(1440, 520, 1.0, pot='#b9765b'),
         person(820, 520, 1.05, 'stand', top='#3f6d7a', bottom='#2d3644', hair='#2b201b', skin=1, hairstyle='short', facing=-1),
         slot(1100, 520, 1.05, 'stand', -1),
         slot(560, 520, 1.0, 'stand', 1)]
    return svg(d, ''.join(b), 'Балкон на закате')
S['balcony'] = balcony

# 6. Метро / электричка
def metro():
    d = grad('mw', [(0, '#dfe6e3'), (1, '#c9d3cf')])
    streak = ''.join(rect(0, 120 + i * 40, W, 4, '#ffffff', 2, f'opacity=".{3+i%4}"') for i in range(6))
    b = [rect(0, 0, W, H, 'url(#mw)')]
    for x in [80, 620, 1160]:
        b.append(rect(x, 90, 380, 230, '#5b6f80', 26)); b.append(f'<g clip-path="url(#mc{x})">{rect(x, 90, 380, 230, "#8fa6b8")}{streak}</g>')
        d += f'<clipPath id="mc{x}"><rect x="{x}" y="90" width="380" height="230" rx="26"/></clipPath>'
    b += [rect(0, 30, W, 12, '#b4bfbb'), *[rect(140 + i * 300, 30, 6, 60, '#9aa7a3') for i in range(5)],
          rect(0, 430, W, 70, '#e07a5f', 18), rect(0, 500, W, 200, '#7b8790'),
          person(380, 460, 0.95, 'sit', top='#3d405b', bottom='#2b2d42', hair='#1c1c1c', skin=4, hairstyle='bun', hold='phone'),
          person(820, 460, 0.95, 'sit', top='#81b29a', bottom='#3a4651', hair='#6b4a2f', skin=2, hairstyle='short'),
          person(1240, 460, 0.95, 'sit', top='#f2cc8f', bottom='#4a5160', hair='#2a1d17', skin=3, hairstyle='curly', facing=-1)]
    return svg(d, ''.join(b), 'Вагон метро')
S['metro'] = metro

# 7. Озеро на рассвете
def lake():
    d = grad('lsky', [(0, '#c9d8ef'), (.7, '#f6d9c3'), (1, '#f8e7d3')]) + grad('lwat', [(0, '#9fb9cf'), (1, '#6f8faa')])
    b = [rect(0, 0, W, H, 'url(#lsky)'), circ(980, 360, 80, '#fff3d6'), lamp_glow(980, 360, 340, op=.75, gid='sun'),
         path('M0,360 C200,300 420,330 600,320 C820,300 1000,340 1200,320 C1380,300 1500,330 1600,320 L1600,420 L0,420Z', '#9aa7b8'),
         rect(0, 410, W, 290, 'url(#lwat)'),
         *[rect(780 + (i * 37) % 400, 430 + i * 24, 90 - i * 6, 5, '#ffeccd', 3, 'opacity=".6"') for i in range(9)],
         path('M0,600 C200,560 360,580 520,560 L520,700 L0,700Z', '#6f8a63'),
         *[path(f'M{60+i*38},620 Q{70+i*38},{520-(i%3)*20} {80+i*38},620Z', '#587a52') for i in range(10)],
         rect(560, 520, 520, 22, '#8a6a4f', 4), *[rect(600 + i * 110, 542, 12, 120, '#6b513d') for i in range(5)],
         person(860, 520, 0.9, 'sit', top='#e9a46a', bottom='#3b4a5a', hair='#3a2a20', skin=0, hairstyle='long', hold='cup'),
         slot(1040, 520, .9, 'sit', -1)]
    return svg(d, ''.join(b), 'Озеро на рассвете')
S['lake'] = lake

# 8. Вечеринка у друзей
def party():
    d = grad('yw', [(0, '#3f4a6b'), (1, '#2f3854')])
    lights = ''.join(circ(80 + i * 64, 90 + 30 * math.sin(i / 2.2), 9, ['#ffd166', '#f4978e', '#a0e7e5'][i % 3]) + lamp_glow(80 + i * 64, 90 + 30 * math.sin(i / 2.2), 40, op=.9) for i in range(24))
    b = [rect(0, 0, W, H, 'url(#yw)'), path('M0,80 Q800,170 1600,70', 'none', 'stroke="#20263a" stroke-width="3"'), lights,
         rect(0, 540, W, 160, '#2a3046'), rect(300, 420, 700, 130, '#c86b5a', 30), rect(300, 360, 700, 90, '#d27c69', 30),
         rect(1080, 430, 260, 24, '#8c6b50', 6), rect(1110, 454, 14, 90, '#6f523d'), rect(1300, 454, 14, 90, '#6f523d'),
         rect(1130, 400, 30, 30, '#f4efe6', 6), rect(1190, 395, 30, 35, '#f4efe6', 6), circ(1270, 415, 22, '#f2c14e'),
         person(430, 450, .95, 'sit', top='#8ecae6', bottom='#22333b', hair='#1a1310', skin=3, hairstyle='curly'),
         person(640, 450, .95, 'sit', top='#ffb703', bottom='#3a3f58', hair='#5b3a22', skin=1, hairstyle='long', facing=-1, hold='cup'),
         person(860, 450, .95, 'sit', top='#90be6d', bottom='#2b2d42', hair='#2a211c', skin=0, hairstyle='short', facing=-1),
         person(1460, 560, 1.0, 'stand', top='#e5989b', bottom='#2f3e46', hair='#1d1a19', skin=2, hairstyle='bun', facing=-1),
         lamp_glow(800, 300, 600, op=.25)]
    return svg(d, ''.join(b), 'Вечер у друзей')
S['party'] = party

# 9. Коробки после переезда
def boxes():
    d = grad('xw', [(0, '#efe8dc'), (1, '#e3d8c6')])
    def box(x, y, w, h, c='#c9a27a'):
        return rect(x, y, w, h, c, 4) + rect(x, y + h * .18, w, 10, '#b28a63') + rect(x + w * .4, y, w * .2, h * .18, '#e6cfaf')
    b = [rect(0, 0, W, H, 'url(#xw)'), window(1080, 70, 380, 300, '#d8e9f0'), lamp_glow(1270, 260, 380, op=.5, gid='sun'),
         rect(0, 540, W, 160, '#b89b7d'), path('M1080,380 L1460,380 L1300,700 L760,700Z', '#fff3d6', 'opacity=".35"'),
         box(120, 400, 220, 150), box(160, 270, 180, 130, '#d3b08a'), box(360, 440, 180, 110), box(1240, 420, 200, 130, '#d3b08a'),
         person(820, 560, 1.0, 'sit', top='#7d8fb3', bottom='#3b4252', hair='#2f2420', skin=1, hairstyle='long'),
         slot(1120, 560, 1.0, 'stand', -1),
         rect(900, 470, 70, 50, '#fff8ea', 4, 'transform="rotate(-12 935 495)"'), rect(908, 480, 40, 6, '#e07a5f', 3, 'transform="rotate(-12 935 495)"'),
         box(600, 470, 150, 80, '#c49a70'), rect(620, 430, 110, 40, '#f4efe6', 4)]
    return svg(d, ''.join(b), 'Коробки после переезда')
S['boxes'] = boxes

# 10. Гостиная родителей
def family():
    d = grad('fw', [(0, '#e9d9c3'), (1, '#dcc7ab')])
    pattern = '<pattern id="fp" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="4" fill="#cdb393"/></pattern>'
    b = [rect(0, 0, W, H, 'url(#fw)'), rect(0, 0, W, 520, 'url(#fp)', 0, 'opacity=".7"'),
         rect(0, 520, W, 180, '#9c7a5c'), rect(0, 512, W, 12, '#7c5d45'),
         rect(140, 120, 200, 150, '#a98563', 6), rect(156, 136, 168, 118, '#cfe0e6', 4), circ(240, 200, 30, '#e4b47a'),
         rect(1150, 200, 280, 330, '#7b5a42', 10), rect(1170, 220, 240, 130, '#d9c4a4', 6), rect(1170, 370, 240, 140, '#6a4c37', 6),
         *[rect(1185 + i * 45, 230, 30, 110, c, 3) for i, c in enumerate(['#b5524a', '#e7c278', '#5c7f8f', '#c98d63', '#86a07c'])],
         path('M1000,300 L1060,190 L1100,190 L1080,300Z', '#e3c38f'), rect(1065, 300, 10, 220, '#5b4636'), lamp_glow(1078, 230, 220, op=.7),
         rect(320, 400, 640, 140, '#6f8b7d', 34), rect(320, 340, 640, 90, '#7d998a', 34), rect(300, 380, 60, 160, '#6f8b7d', 24), rect(940, 380, 60, 160, '#6f8b7d', 24),
         person(480, 450, .95, 'sit', top='#b56576', bottom='#4a4e69', hair='#7c7c7c', skin=0, hairstyle='bun'),
         person(780, 450, .95, 'sit', top='#5e6472', bottom='#3a3a46', hair='#9a9a9a', skin=1, hairstyle='short', facing=-1),
         slot(1080, 560, .95, 'stand', -1),
         rect(560, 560, 200, 20, '#7c5d45', 8), rect(600, 540, 40, 24, '#f4efe6', 6)]
    return svg(d + pattern, ''.join(b), 'Гостиная родителей')
S['family'] = family

# 11. Спокойная комната днём (тело и забота)
def calm():
    d = grad('cw', [(0, '#eef1e6'), (1, '#e1e8d6')])
    b = [rect(0, 0, W, H, 'url(#cw)'), window(220, 60, 420, 360, '#d4ebf2', frame='#fbfaf4'),
         path('M220,420 L640,420 L980,700 L380,700Z', '#fff6d8', 'opacity=".5"'),
         rect(0, 540, W, 160, '#d3c2a6'), rect(560, 590, 520, 60, '#9cc5a1', 20),
         person(820, 600, 1.0, 'sit', top='#f4a261', bottom='#6d6875', hair='#3c2a21', skin=2, hairstyle='bun'),
         slot(1060, 600, 1.0, 'sit', -1),
         slot(560, 600, 1.0, 'sit', 1),
         plant(1250, 540, 1.3), plant(140, 540, .9, pot='#a7b4a1'), rect(1360, 380, 160, 160, '#efe3cf', 10),
         rect(1380, 400, 120, 20, '#cdb38d', 6), rect(1380, 440, 90, 20, '#e2a58a', 6), rect(1380, 480, 110, 20, '#9fc0b0', 6)]
    return svg(d, ''.join(b), 'Спокойная комната')
S['calm'] = calm

# 12. Переговорная
def meeting():
    d = grad('rw', [(0, '#e6ebee'), (1, '#d5dde2')])
    b = [rect(0, 0, W, H, 'url(#rw)'), rect(560, 70, 480, 270, '#2f3b46', 12), rect(576, 86, 448, 238, '#f7f9fa', 6),
         rect(610, 120, 180, 14, '#3d5a80', 5), *[rect(610, 160 + i * 34, 300 - i * 50, 12, '#c3d0db', 5) for i in range(4)],
         path('M840,300 L880,240 L920,270 L980,160', 'none', 'stroke="#ee6c4d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"'),
         rect(0, 540, W, 160, '#a5afb5'), path('M300,470 L1300,470 L1380,560 L220,560Z', '#ffffff'), rect(220, 560, 1160, 20, '#c9d1d6'),
         person(380, 480, .9, 'sit', top='#98c1d9', bottom='#293241', hair='#2b2b2b', skin=0, hairstyle='short'),
         person(1220, 480, .9, 'sit', top='#e0fbfc', bottom='#3d5a80', hair='#4a3426', skin=3, hairstyle='long', facing=-1),
         slot(800, 470, .85, 'sit', 1),
         rect(560, 440, 120, 30, '#f2f2f2', 4), rect(940, 445, 60, 26, '#f4efe6', 6), plant(1480, 540, 1.0)]
    return svg(d, ''.join(b), 'Переговорная')
S['meeting'] = meeting

# 13. Кафе (своё)
def cafe2():
    d = grad('kw', [(0, '#f1e4d3'), (1, '#e2cdb3')])
    b = [rect(0, 0, W, H, 'url(#kw)'), rect(0, 0, W, 60, '#3f5e4f'),
         *[path(f'M{i*100},60 L{i*100+50},110 L{i*100+100},60Z', '#e8d6a6' if i % 2 else '#f4ecd8') for i in range(16)],
         window(110, 160, 420, 280, '#cde3e9'), rect(900, 330, 620, 210, '#7a5440', 10), rect(900, 310, 620, 30, '#5c3f30', 8),
         rect(960, 250, 60, 60, '#e9e4dc', 8), rect(1060, 230, 120, 80, '#2f3a40', 8), lamp_glow(1200, 180, 260, op=.6),
         rect(560, 440, 260, 20, '#5c3f30', 10), rect(682, 460, 16, 90, '#4a3428'),
         rect(600, 410, 36, 30, '#f4efe6', 8), rect(730, 414, 36, 26, '#f4efe6', 8),
         rect(0, 540, W, 160, '#b88f6d'),
         person(560, 470, .9, 'sit', top='#6d597a', bottom='#355070', hair='#2a1f1b', skin=1, hairstyle='curly'),
         person(830, 470, .9, 'sit', top='#e56b6f', bottom='#2f3e46', hair='#6c4a33', skin=0, hairstyle='long', facing=-1),
         slot(1200, 560, .95, 'stand', -1),
         plant(1460, 300, .7)]
    return svg(d, ''.join(b), 'Кафе')
S['cafe2'] = cafe2

# 14. Кухня ночью
def kitchen2():
    d = grad('qw', [(0, '#e9e1d2'), (1, '#d8ccb8')])
    b = [rect(0, 0, W, H, 'url(#qw)'), window(1020, 80, 360, 260, '#2e3e5c', extra=circ(1300, 140, 26, '#f6ecd0')),
         rect(0, 330, W, 30, '#c8b89f'), *[rect(40 + i * 120, 120, 100, 160, '#7fa69a', 8) for i in range(6)],
         rect(0, 360, 760, 180, '#6f9087', 6), rect(0, 360, 760, 20, '#e6ddce'),
         rect(820, 450, 520, 22, '#8c6b50', 6), rect(850, 472, 16, 100, '#6f523d'), rect(1300, 472, 16, 100, '#6f523d'),
         rect(1060, 420, 34, 30, '#f4efe6', 8), path('M1000,180 L1040,90 L1060,90 L1040,180Z', '#3a3f47'),
         lamp_glow(1100, 330, 300, op=.7), rect(0, 540, W, 160, '#b29b80'),
         person(980, 470, .95, 'sit', top='#52796f', bottom='#354f52', hair='#2a211c', skin=1, hairstyle='short', hold='cup'),
         slot(1220, 470, .95, 'sit', -1),
         plant(1460, 540, .9)]
    return svg(d, ''.join(b), 'Кухня вечером')
S['kitchen2'] = kitchen2

# 15. Улица города днём
def street2():
    d = grad('tsky', [(0, '#cfe3ee'), (1, '#f6ead7')])
    b = [rect(0, 0, W, H, 'url(#tsky)'), skyline(520, '#c5b4a3', 11, 0, W, 120, 360), skyline(560, '#b29d8a', 13, 0, W, 60, 220),
         rect(0, 560, W, 140, '#9a948c'), rect(0, 556, W, 10, '#d7d0c6'), *[rect(60 + i * 180, 630, 90, 10, '#e6e1d8', 3) for i in range(9)],
         tree(260, 560, .8), tree(1300, 560, .9, '#7fa775'),
         person(620, 600, .95, 'stand', top='#e07a5f', bottom='#3d405b', hair='#2b201b', skin=0, hairstyle='long'),
         person(900, 600, .95, 'stand', top='#81b29a', bottom='#2f3e46', hair='#1d1a19', skin=3, hairstyle='short', facing=-1),
         slot(1180, 600, .95, 'stand', -1),
         rect(1060, 470, 10, 130, '#4a4f57'), circ(1065, 460, 20, '#f2e3a8')]
    return svg(d, ''.join(b), 'Улица')
S['street2'] = street2

if __name__ == '__main__':
    import json
    os.makedirs(OUT, exist_ok=True); spots = {}
    for k, f in S.items():
        SPOTS.clear(); body = f()
        open(f'{OUT}/{k}.svg', 'w').write(body)
        if MODE == 'bg': spots[k] = list(SPOTS)
    if MODE == 'bg': open(f'{OUT}/spots.json', 'w').write(json.dumps(spots))
    print(len(S), 'сцен', MODE)
