"use client"
import { useEffect, useState } from "react"
import { Bell, BellOff, BellRing } from "lucide-react"

export function PushNotifications() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setSupported(ok)
    if (ok) checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {}
  }

  async function handleToggle() {
    setLoading(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setError("Permiso denegado. Habilitalo en configuracion del sitio.")
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()

      if (existing) {
        await existing.unsubscribe()
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint })
        })
        setSubscribed(false)
      } else {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array("BFSmwxBryW9PZGTLuVxVTOnHIeEoetMjbaIxO-94dtHF1F1yy2GaRssNmG7BQa0hwXlrASR4r0QVPxB-f7_4jrg")
        })
        const key = sub.getKey("p256dh")
        const auth = sub.getKey("auth")
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "",
            auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
          })
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? "Error al suscribir")
        } else {
          setSubscribed(true)
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido")
    }
    setLoading(false)
  }

  if (!supported) return null

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg w-full text-left text-[12.5px] font-medium text-[#7a9e74] hover:bg-white/5 hover:text-[#c8f0b8] transition-colors disabled:opacity-50"
      >
        {loading
          ? <BellRing className="w-4 h-4 shrink-0 animate-pulse" />
          : subscribed
            ? <BellOff className="w-4 h-4 shrink-0" />
            : <Bell className="w-4 h-4 shrink-0" />
        }
        <span>{loading ? "Configurando..." : subscribed ? "Notif. activas" : "Activar notif."}</span>
      </button>
      {error && <p className="text-[10px] text-red-400 px-3 pb-1">{error}</p>}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}