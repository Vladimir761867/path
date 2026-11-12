LOOKS = {
 'trevoga': {'hero': {'skin': 0, 'hair': '#2d2420'}, 'irina': {'style': 'bun', 'hair': '#4a3426', 'skin': 4}, 'dima': {'style': 'short', 'hair': '#1f1a17', 'skin': 2}, 'vera': {'style': 'long', 'hair': '#6b4a2f', 'skin': 1}},
 'kritik': {'hero': {'skin': 2, 'hair': '#5a3825'}, 'nika': {'style': 'long', 'hair': '#2a1f1b', 'skin': 0}, 'oleg': {'style': 'short', 'hair': '#5b5b5b', 'skin': 1}},
 'razgovor': {'hero': {'skin': 1, 'hair': '#2b201b'}, 'olya': {'style': 'long', 'hair': '#8a5a3a', 'skin': 0}, 'tema': {'style': 'short', 'hair': '#1d1a19', 'skin': 3}},
 'net-sil': {'hero': {'skin': 0, 'hair': '#4a3426'}, 'roma': {'style': 'short', 'hair': '#2a211c', 'skin': 2}, 'lena': {'style': 'bun', 'hair': '#2b2b2b', 'skin': 1}},
 'svoi-resheniya': {'hero': {'skin': 1, 'hair': '#3a2a22'}, 'mama': {'style': 'bun', 'hair': '#7c7c7c', 'skin': 0}, 'kostya': {'style': 'short', 'hair': '#5b3a22', 'skin': 3}, 'papa': {'style': 'grey', 'hair': '#9a9a9a', 'skin': 1}},
 's-soboy': {'hero': {'skin': 4, 'hair': '#2a1f1b'}, 'nika': {'style': 'long', 'hair': '#5b3a22', 'skin': 2}, 'dasha': {'style': 'bun', 'hair': '#1d1a19', 'skin': 3}, 'mama': {'style': 'bun', 'hair': '#8a8a8a', 'skin': 4}},
 'odinochestvo': {'hero': {'skin': 2, 'hair': '#1d1a19'}, 'liza': {'style': 'long', 'hair': '#a0522d', 'skin': 0}, 'petr': {'style': 'grey', 'hair': '#bdbdbd', 'skin': 1}, 'sasha': {'style': 'short', 'hair': '#3a2a22', 'skin': 1}},
 'vygoranie': {'hero': {'skin': 0, 'hair': '#5a3825'}, 'sergey': {'style': 'short', 'hair': '#2b2b2b', 'skin': 1}, 'artem': {'style': 'short', 'hair': '#6b4a2f', 'skin': 2}, 'lera': {'style': 'long', 'hair': '#1d1a19', 'skin': 3}},
 'poterya': {'hero': {'skin': 1, 'hair': '#2a1f1b'}, 'tim': {'style': 'curly', 'hair': '#1a1310', 'skin': 3}, 'nina': {'style': 'bun', 'hair': '#9a9a9a', 'skin': 0}, 'mama': {'style': 'bun', 'hair': '#6b6b6b', 'skin': 1}},
 'telo': {'hero': {'skin': 3, 'hair': '#1a1310'}, 'raya': {'style': 'long', 'hair': '#2a1d17', 'skin': 3}, 'doc': {'style': 'bun', 'hair': '#3a2a22', 'skin': 2}},
 'primirenie': {'hero': {'skin': 0, 'hair': '#a0522d'}, 'pasha': {'style': 'short', 'hair': '#2a211c', 'skin': 1}, 'katya': {'style': 'long', 'hair': '#5b3a22', 'skin': 4}},
}
def apply(st):
    L = LOOKS.get(st['id'], {})
    if 'hero' in L: st['hero']['look'] = L['hero']
    for k, v in L.items():
        if k in st['npcs']: st['npcs'][k]['look'] = v
