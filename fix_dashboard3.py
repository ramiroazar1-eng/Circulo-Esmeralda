with open("src/app/dashboard/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old = """      {/* Ciclo activo */}
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
          </div>"""

new = """      {/* Ciclo activo */}
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
          </div>"""

if old in content:
    print("Found section")
else:
    print("Section not found - checking content...")
    # Buscar el inicio
    idx = content.find("Ciclo activo")
    if idx > -1:
        print(repr(content[idx-50:idx+200]))

with open("src/app/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
