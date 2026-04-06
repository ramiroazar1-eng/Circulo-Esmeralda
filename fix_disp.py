content = open("src/app/dispensas/page.tsx", "r", encoding="utf-8").read()
content = content.replace(
    '.select("lot_id, lot_code, available_grams, genetic_name")',
    '.select("lot_id, lot_code, available_grams, genetic_name, genetic_id")'
)
open("src/app/dispensas/page.tsx", "w", encoding="utf-8").write(content)
print("OK")
