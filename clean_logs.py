content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "console.log('LOAD STARTED')\n      ",
    ""
)
content = content.replace(
    "console.log('PROF:', JSON.stringify({ role: prof?.role, patient_id: prof?.patient_id, has_patient: !!(prof as any)?.patient, plan: (prof as any)?.patient?.membership_plan }))\n      ",
    ""
)
open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK - logs removidos")
