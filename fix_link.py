content = open("src/app/dispensas/pedidos/OrdersPanel.tsx", "r", encoding="utf-8").read()
content = content.replace(
    '                    <p className="text-base font-bold text-[#1a2e1a]">{order.patient?.full_name ?? "-"}</p>',
    '                    <a href={`/pacientes/${order.patient_id}`} className="text-base font-bold text-[#1a2e1a] hover:text-[#2d5a27] hover:underline">{order.patient?.full_name ?? "-"}</a>'
)
open("src/app/dispensas/pedidos/OrdersPanel.tsx", "w", encoding="utf-8").write(content)
print("OK")
