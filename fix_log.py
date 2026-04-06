content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "async function load() {\n      const supabase = createClient()",
    "async function load() {\n      console.log('LOAD STARTED')\n      const supabase = createClient()"
)
open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
