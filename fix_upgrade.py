content = open("src/app/mi-perfil/PlanRequestWidget.tsx", "r", encoding="utf-8").read()
content = content.replace(
    "  const upgradeOptions = plans.filter(p => p.id !== currentPlanId && (p.monthly_grams ?? 0) > (currentPlanGrams ?? 0))",
    "  const upgradeOptions = plans.filter(p => p.id !== currentPlanId)"
)
open("src/app/mi-perfil/PlanRequestWidget.tsx", "w", encoding="utf-8").write(content)
print("OK")
