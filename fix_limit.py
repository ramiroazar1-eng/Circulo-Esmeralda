content = open("src/app/api/orders/create/route.ts", "r", encoding="utf-8").read()

content = content.replace(
    '.not("status", "eq", "cancelado")',
    '.in("status", ["nuevo", "pendiente_aprobacion", "aprobado", "en_preparacion", "empaquetado"])'
)

open("src/app/api/orders/create/route.ts", "w", encoding="utf-8").write(content)
print("OK")
