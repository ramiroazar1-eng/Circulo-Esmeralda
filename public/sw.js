self.addEventListener("install", (e) => { self.skipWaiting() })
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()) })
self.addEventListener("fetch", (e) => { e.respondWith(fetch(e.request)) })

self.addEventListener("push", (e) => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = e.notification.data?.url || "/"
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})