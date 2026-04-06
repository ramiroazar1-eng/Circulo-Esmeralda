content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
idx = content.find("async function load()")
print(repr(content[idx:idx+400]))
