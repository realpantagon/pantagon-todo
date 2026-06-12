/* global clients */
// Custom Service Worker — handles Web Push events
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'My To-Do'
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'mytodo',
    renotify: true,
    data: { url: data.url || '/' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.includes(self.location.origin))
      if (match) return match.focus()
      return clients.openWindow(event.notification.data?.url || '/')
    })
  )
})
