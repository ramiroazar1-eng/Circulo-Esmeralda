with open("src/app/dashboard/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Reemplazar los simbolos corruptos
content = content.replace(
    "Lote {d.lot?.lot_code ?? \"-\"} \u00c3\u0083\u00c6\u0092\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u00b7 {formatDate(d.dispensed_at)}",
    "Lote {d.lot?.lot_code ?? \"-\"} \u00b7 {formatDate(d.dispensed_at)}"
)
content = content.replace(
    "{formatDate(entry.entry_date)} \u00c3\u0083\u00c6\u0092\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u00b7 {(entry as any).created_by_profile?.full_name ?? \"-\"}",
    "{formatDate(entry.entry_date)} \u00b7 {(entry as any).created_by_profile?.full_name ?? \"-\"}"
)

with open("src/app/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
