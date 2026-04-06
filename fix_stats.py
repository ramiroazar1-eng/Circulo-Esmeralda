content = open("src/app/mi-perfil/page.tsx", "r", encoding="utf-8").read()

# Reemplazar import de ConsumoChart
content = content.replace(
    'import ConsumoChart from "./ConsumoChart"',
    'import StatsGamificados from "./StatsGamificados"'
)

# Reemplazar el bloque del grafico
old_chart = '''        {chartData.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Consumo ultimos 12 meses</p>
            <ConsumoChart data={chartData} />
          </div>
        )}'''

new_chart = '        <StatsGamificados patientId={patient?.id ?? ""} firstName={firstName ?? ""} createdAt={patient?.created_at ?? null} />'

content = content.replace(old_chart, new_chart)

open("src/app/mi-perfil/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
