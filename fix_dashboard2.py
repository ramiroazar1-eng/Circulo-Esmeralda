with open("src/app/dashboard/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Agregar import CycleRoomPanel
content = content.replace(
    "import PlanReviewButtons from \"./PlanReviewButtons\"",
    "import PlanReviewButtons from \"./PlanReviewButtons\"\nimport CycleRoomPanel from \"./CycleRoomPanel\""
)

# Agregar products query
content = content.replace(
    "    supabase.from(\"v_active_plants\").select(\"room_id, room_name, plant_count, plants_veg, plants_flower, plants_seedling\"),",
    "    supabase.from(\"v_active_plants\").select(\"room_id, room_name, plant_count, plants_veg, plants_flower, plants_seedling\"),\n    supabase.from(\"v_supply_stock\").select(\"id, name, unit, stock_actual, last_unit_cost\").eq(\"is_active\", true).gt(\"stock_actual\", 0),"
)

# Agregar variable en destructuring
content = content.replace(
    "activeCycle, plannedEvents, activePlantsRes",
    "activeCycle, plannedEvents, activePlantsRes, dashProductsRes"
)

# Agregar variable dashProducts
content = content.replace(
    "const upcomingEvents = (plannedEvents.data ?? []) as any[]",
    "const upcomingEvents = (plannedEvents.data ?? []) as any[]\n  const dashProducts = (dashProductsRes?.data ?? []) as any[]"
)

with open("src/app/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
