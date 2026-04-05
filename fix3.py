content = open("src/app/dispensas/pedidos/OrdersPanel.tsx", "r", encoding="utf-8").read()

old = 'loadOrders()\n\n    // Realtime\n    const channel = supabase\n      .channel("orders-realtime-" + Math.random())\n      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {\n        console.log("Realtime event:", payload)\n        loadOrders()\n      })\n      .subscribe((status) => {\n        console.log("Realtime status:", status)\n      })\n\n    return () => { supabase.removeChannel(channel) }'

new = 'loadOrders()\n    const interval = setInterval(loadOrders, 3000)\n    return () => clearInterval(interval)'

content = content.replace(old, new)
open("src/app/dispensas/pedidos/OrdersPanel.tsx", "w", encoding="utf-8").write(content)
print("OK")
