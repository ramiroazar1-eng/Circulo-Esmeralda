# -*- coding: utf-8 -*-
content = open("src/app/mi-perfil/StatsGamificados.tsx", "r", encoding="utf-8").read()

replacements = [
    ('icon: "\u2605"', 'icon: "1er"'),
    ('icon: "\u2666"', 'icon: "6m"'),
    ('icon: "\u25c8"', 'icon: "5g"'),
    ('icon: "\u25cf"', 'icon: "T3"'),
    ('icon: "\u2665"', 'icon: "12m"'),
    ('icon: "\u25b2"', 'icon: "#1"'),
    ('"Este ano"', '"Este \u00e1o"'),
]

for old, new in replacements:
    content = content.replace(old, new)

open("src/app/mi-perfil/StatsGamificados.tsx", "w", encoding="utf-8").write(content)
print("OK")
