content = open("src/app/mi-perfil/PedidosWidget.tsx", "r", encoding="utf-8").read()

old = '''            {order.delivery_type === "envio" && (
                <p style={{ fontSize: "11px", color: "#60a5fa", marginTop: "4px" }}>Envio a domicilio</p>
              )}'''

new = '''            {order.delivery_type === "envio" && (
                <p style={{ fontSize: "11px", color: "#60a5fa", marginTop: "4px" }}>Envio a domicilio</p>
              )}
              {["nuevo", "pendiente_aprobacion"].includes(order.status) && (
                <button onClick={() => cancelOrder(order.id)}
                  style={{ marginTop: "6px", fontSize: "11px", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "4px 10px", cursor: "pointer" }}>
                  Cancelar pedido
                </button>
              )}'''

content = content.replace(old, new)

# Agregar funcion cancelOrder
old_submit = '''  async function handleSubmit'''
new_submit = '''  async function cancelOrder(orderId: string) {
    if (!confirm("Cancelar este pedido?")) return
    await fetch("/api/orders/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status: "cancelado" })
    })
  }

  async function handleSubmit'''

content = content.replace(old_submit, new_submit)

open("src/app/mi-perfil/PedidosWidget.tsx", "w", encoding="utf-8").write(content)
print("OK")
