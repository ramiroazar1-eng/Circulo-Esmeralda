content = open("src/app/api/orders/create/route.ts", "r", encoding="utf-8").read()

content = content.replace(
    "const { patient_id, genetic_id, lot_id, grams, product_desc, notes } = body",
    "const { patient_id, genetic_id, lot_id, grams, product_desc, notes, delivery_type, delivery_address, delivery_phone } = body"
)

content = content.replace(
    """      product_desc: product_desc || "flor seca",
      notes: notes || null,
      status: "nuevo",""",
    """      product_desc: product_desc || "flor seca",
      notes: notes || null,
      delivery_type: delivery_type || "retiro",
      delivery_address: delivery_address || null,
      delivery_phone: delivery_phone || null,
      status: "nuevo","""
)

open("src/app/api/orders/create/route.ts", "w", encoding="utf-8").write(content)
print("OK")
