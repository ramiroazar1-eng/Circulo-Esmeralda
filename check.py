content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
idx = content.find("avgMonthly")
print(repr(content[idx:idx+200]))
