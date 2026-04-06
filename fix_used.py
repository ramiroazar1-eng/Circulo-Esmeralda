content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()

# Agregar calculo del mes actual
old = "  const avgMonthly = totalGramsYear / 12"
new = """  const avgMonthly = totalGramsYear / 12
  const now2 = new Date()
  const currentMonthGrams = dispenses
    .filter((d: any) => {
      const dd = new Date(d.dispensed_at)
      return dd.getMonth() === now2.getMonth() && dd.getFullYear() === now2.getFullYear()
    })
    .reduce((acc: number, d: any) => acc + (d.grams ?? 0), 0)"""

content = content.replace(old, new)

# Actualizar el prop usedGrams para usar el mes actual
content = content.replace(
    "usedGrams={Math.round(avgMonthly)}",
    "usedGrams={Math.round(currentMonthGrams)}"
)

open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
