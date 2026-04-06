content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "if (!prof) { router.push(\"/login\"); return }",
    "console.log('PROF:', JSON.stringify({ role: prof?.role, patient_id: prof?.patient_id, has_patient: !!(prof as any)?.patient, plan: (prof as any)?.patient?.membership_plan }))\n      if (!prof) { router.push(\"/login\"); return }"
)
open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
