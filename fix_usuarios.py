content = open("src/app/usuarios/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    '.select("*, patient:patients(full_name)")',
    '.select("*, patient:patients!profiles_patient_id_fkey(full_name)")'
)
open("src/app/usuarios/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
