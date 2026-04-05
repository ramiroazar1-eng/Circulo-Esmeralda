content = open("src/app/dispensas/pedidos/OrdersPanel.tsx", "r", encoding="utf-8").read()

old = """    loadOrders()
    // Realtime
    const channel = supabase
      .channel("orders-realtime-" + Math.random())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        console.log("Realtime event:", payload)
        loadOrders()
      })
      .subscribe((status) => {
        console.log("Realtime status:", status)
      })

    return () => { supabase.removeChannel(channel) }"""

new = """    loadOrders()
    const interval = setInterval(loadOrders, 3000)
    return () => clearInterval(interval)"""

if old in content:
    content = content.replace(old, new)
    open("src/app/dispensas/pedidos/OrdersPanel.tsx", "w", encoding="utf-8").write(content)
    print("OK - reemplazado")
else:
    print("No encontrado - buscando patron...")
    idx = content.find("loadOrders()\n    // Realtime")
    print(f"Index: {idx}")
    print(repr(content[idx:idx+300]))
