content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    'if (pat) {',
    'console.log("PAT ID:", pat?.id)\n      if (pat) {'
)
open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
