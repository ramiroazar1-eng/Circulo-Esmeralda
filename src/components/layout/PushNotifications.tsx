"use client"
import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"

export function PushNotifications() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true)
      checkSubscription()
    }
  }, [])

  async function checkSubscription() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setSubscribed(!!sub)
  }

  async function handleToggle() {
    setLoading(true)
    try {
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
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        })
        const key = sub.getKey("p256dh")
        const auth = sub.getKey("auth")
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "",
            auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
          })
        })
        setSubscribed(true)
      }
    } catch (err) {
      console.error("Push error:", err)
    }
    setLoading(false)
  }

  if (!supported) return null

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={subscribed ? "Desactivar notificaciones" : "Activar notificaciones"}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors w-full text-left text-[#7a9e74] hover:bg-white/5 hover:text-[#c8f0b8] disabled:opacity-50"
    >
      {subscribed
        ? <><BellOff className="w-4 h-4 shrink-0" /><span>Notificaciones activas</span></>
        : <><Bell className="w-4 h-4 shrink-0" /><span>Activar notificaciones</span></>
      }
    </button>
  )
}