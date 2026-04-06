content = open("src/app/dispensas/pedidos/OrdersPanel.tsx", "r", encoding="utf-8").read()

# Agregar estado para tracking de pedidos nuevos
old_states = '''  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("activos")
  const [assigningLot, setAssigningLot] = useState<string | null>(null)
  const [selectedLot, setSelectedLot] = useState<Record<string, string>>({})'''

new_states = '''  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("activos")
  const [assigningLot, setAssigningLot] = useState<string | null>(null)
  const [selectedLot, setSelectedLot] = useState<Record<string, string>>({})
  const [prevActiveCount, setPrevActiveCount] = useState<number | null>(null)
  const [newOrderAlert, setNewOrderAlert] = useState(false)'''

content = content.replace(old_states, new_states)

# Agregar logica de notificacion en loadOrders
old_load = '''      setOrders((data ?? []) as Order[])
      setLoading(false)
    }'''

new_load = '''      const newData = (data ?? []) as Order[]
      const activeCount = newData.filter(o => !["entregado","cancelado"].includes(o.status)).length
      
      setPrevActiveCount(prev => {
        if (prev !== null && activeCount > prev) {
          // Nuevo pedido detectado
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 5000)
          // Sonido
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.setValueAtTime(880, ctx.currentTime)
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.4)
          } catch(e) {}
          // Push notification
          if (Notification.permission === "granted") {
            new Notification("Nuevo pedido", {
              body: `Hay ${activeCount} pedido${activeCount !== 1 ? "s" : ""} activo${activeCount !== 1 ? "s" : ""}`,
              icon: "/favicon.ico"
            })
          }
        }
        return activeCount
      })
      
      setOrders(newData)
      setLoading(false)
    }'''

content = content.replace(old_load, new_load)

# Agregar boton de activar notificaciones y alerta visual antes de los stats
old_stats = '''      {/* Stats rapidas */}
      <div className="grid grid-cols-4 gap-3">'''

new_stats = '''      {/* Alerta nuevo pedido */}
      {newOrderAlert && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse">
          <span className="text-xl">??</span>
          <p className="text-sm font-semibold text-blue-700">Nuevo pedido recibido</p>
        </div>
      )}

      {/* Boton notificaciones */}
      {typeof window !== "undefined" && Notification.permission === "default" && (
        <button onClick={() => Notification.requestPermission()}
          className="w-full text-xs text-slate-500 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
          ?? Activar notificaciones del navegador
        </button>
      )}

      {/* Stats rapidas */}
      <div className="grid grid-cols-4 gap-3">'''

content = content.replace(old_stats, new_stats)

open("src/app/dispensas/pedidos/OrdersPanel.tsx", "w", encoding="utf-8").write(content)
print("OK")
