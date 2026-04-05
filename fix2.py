content = open("src/app/dispensas/pedidos/OrdersPanel.tsx", "r", encoding="utf-8").read()
idx = content.find("loadOrders()\n")
print(repr(content[idx:idx+400]))
