content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()

# Agregar import
content = content.replace(
    'import PlanRequestWidget from "./PlanRequestWidget"',
    'import PlanRequestWidget from "./PlanRequestWidget"\nimport FirmaDocumento from "./FirmaDocumento"'
)

# Agregar componente antes del LogoutButton
content = content.replace(
    '        <PlanRequestWidget',
    '        <FirmaDocumento patientId={patient?.id ?? ""} patientName={patient?.full_name ?? ""} patientDni={patient?.dni ?? ""} />\n        <PlanRequestWidget'
)

open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
