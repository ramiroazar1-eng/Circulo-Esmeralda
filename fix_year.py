# -*- coding: utf-8 -*-
content = open("src/app/mi-perfil/StatsGamificados.tsx", "r", encoding="utf-8").read()
content = content.replace('"Este ano"', '"Este \u00e1\u00f1o"')
content = content.replace('"ultimo a\u00c3\u00b1o"', '"ultimo a\u00f1o"')
open("src/app/mi-perfil/StatsGamificados.tsx", "w", encoding="utf-8").write(content)

content2 = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
content2 = content2.replace('"ultimo a\u00c3\u00b1o"', '"ultimo a\u00f1o"')
open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content2)
print("OK")
