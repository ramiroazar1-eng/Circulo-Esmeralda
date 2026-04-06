content = open("src/app/dispensas/pedidos/OrdersPanel.tsx", "r", encoding="utf-8").read()

# Agregar delivery_type al interface Order
content = content.replace(
    "  lot_id: string | null",
    "  lot_id: string | null\n  delivery_type: string | null\n  delivery_address: string | null\n  delivery_phone: string | null"
)

# Mostrar tipo de entrega en la tarjeta
content = content.replace(
    "                    {order.notes && <p className=\"text-xs text-slate-500 mt-1 italic\">{order.notes}</p>}",
    """                    {order.delivery_type === "envio" && (
                      <div className="mt-1 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1">
                        <span className="font-semibold text-blue-700">Envio: </span>
                        <span className="text-blue-600">{order.delivery_address}</span>
                        {order.delivery_phone && <span className="text-blue-500"> - Tel: {order.delivery_phone}</span>}
                      </div>
                    )}
                    {order.notes && <p className="text-xs text-slate-500 mt-1 italic">{order.notes}</p>}"""
)

open("src/app/dispensas/pedidos/OrdersPanel.tsx", "w", encoding="utf-8").write(content)
print("OK")
