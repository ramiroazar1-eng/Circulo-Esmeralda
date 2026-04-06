content = open("src/app/mi-perfil/PlanRequestWidget.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "  const isOverLimit = currentPlanGrams !== null && usedGrams >= currentPlanGrams",
    "  const isOverLimit = true // Siempre mostrar opciones"
)
open("src/app/mi-perfil/PlanRequestWidget.tsx", "w", encoding="utf-8").write(content)
print("OK")
