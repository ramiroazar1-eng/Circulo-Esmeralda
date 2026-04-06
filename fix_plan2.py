content = open("src/app/mi-perfil/PlanRequestWidget.tsx", "r", encoding="utf-8").read()
content = content.replace(
    'currentPlanGrams !== null && usedGrams >= currentPlanGrams ? "Limite mensual alcanzado" : "Hacer un pedido"',
    '"Gestionar mi plan"'
)
content = content.replace(
    '<AlertCircle size={14} color="#f87171" />\n            <p style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>Alcanzaste tu limite mensual</p>',
    '<TrendingUp size={14} color="#a8e095" />\n            <p style={{ fontSize: "12px", fontWeight: 700, color: "#a8e095" }}>Gestionar mi plan</p>'
)
open("src/app/mi-perfil/PlanRequestWidget.tsx", "w", encoding="utf-8").write(content)
print("OK")
