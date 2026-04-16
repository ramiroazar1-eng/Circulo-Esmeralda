with open("src/app/dashboard/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: eliminar import duplicado
content = content.replace(
    "import CycleRoomPanel from \"./CycleRoomPanel\"\nimport CycleRoomPanel from \"./CycleRoomPanel\"",
    "import CycleRoomPanel from \"./CycleRoomPanel\""
)

# Fix 2: eliminar variable duplicada
content = content.replace(
    "  const dashProducts = (dashProductsRes?.data ?? []) as any[]\n  const dashProducts = (activePlantsRes?.data ?? []) as any[] // placeholder reemplazado abajo\n",
    "  const dashProducts = (dashProductsRes?.data ?? []) as any[]\n"
)

with open("src/app/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
