content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    'const dispList = dispensesRes.data ?? []',
    'console.log("DISPENSES:", dispensesRes.data?.length, dispensesRes.error?.message)\n        const dispList = dispensesRes.data ?? []'
)
open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
