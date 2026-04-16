with open("src/app/dashboard/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Encontrar y reemplazar toda la seccion del ciclo activo
start_marker = "      {/* Ciclo activo */}"
end_marker = "      {/* Pedidos pendientes */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"start: {start_idx}, end: {end_idx}")
    # Buscar alternativo
    for marker in ["Ciclo activo", "Pedidos pendientes", "Pedidos activos"]:
        idx = content.find(marker)
        print(f"{marker}: {idx}")
else:
    new_section = """      {/* Ciclo activo */}
      {canSeeCultivo && cycle && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div>
              <SectionHeader title={`Ciclo activo \u2014 ${cycle.name}`} />
              <p className="text-xs text-slate-500 -mt-3">Desde {formatDate(cycle.start_date)} \u00b7 {lots.length} lote{lots.length !== 1 ? "s" : ""} \u00b7 {totalActivePlants} plantas activas</p>
            </div>
            <Link href={`/ciclos/${cycle.id}`} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0">
              Ver ciclo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 pb-5">
            <CycleRoomPanel
              cycleId={cycle.id}
              rooms={activePlants}
              lots={lots}
              products={dashProducts}
              allRooms={activePlants.map((r: any) => ({ id: r.room_id, name: r.room_name, square_meters: r.square_meters }))}
            />
            <div className="flex gap-2 mt-3">
              <Link href={`/ciclos/${cycle.id}/timeline`} className="text-xs text-[#2d5a27] hover:underline flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />Ver linea de tiempo
              </Link>
            </div>
          </div>
        </Card>
      )}

"""
    content = content[:start_idx] + new_section + content[end_idx:]
    print("Replaced successfully")

with open("src/app/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
