content = open("src/app/api/orders/label/route.ts", "r", encoding="utf-8").read()

# Agregar order_items al select
content = content.replace(
    '.select("*, patient:patients(full_name, dni), genetic:genetics(name), lot:lots(lot_code), packed_by_profile:profiles!orders_packed_by_fkey(full_name)")',
    '.select("*, patient:patients(full_name, dni), lot:lots(lot_code), packed_by_profile:profiles!orders_packed_by_fkey(full_name), items:order_items(grams, genetic:genetics(name), lot:lots(lot_code))")'
)

# Reemplazar seccion de genetica/lote en el HTML por lista de items
old_detail = '''  <div class="detail-row">
    <span class="detail-label">Genetica</span>
    <span class="detail-value">${(order as any).genetic?.name ?? "Sin especificar"}</span>
  </div>
  <div class="detail-row">
    <span class="detail-label">Lote</span>
    <span class="detail-value" style="font-family:monospace">${(order as any).lot?.lot_code ?? "Por asignar"}</span>
  </div>'''

new_detail = '''  ${((order as any).items ?? []).length > 0 
    ? (order as any).items.map((item: any) => `
  <div class="detail-row">
    <span class="detail-label">${item.genetic?.name ?? "Sin genetica"}</span>
    <span class="detail-value">${item.grams}g - <span style="font-family:monospace">${item.lot?.lot_code ?? "Sin lote"}</span></span>
  </div>`).join("")
    : `<div class="detail-row"><span class="detail-label">Genetica</span><span class="detail-value">${(order as any).genetic?.name ?? "Sin especificar"}</span></div>`
  }'''

content = content.replace(old_detail, new_detail)

open("src/app/api/orders/label/route.ts", "w", encoding="utf-8").write(content)
print("OK")
