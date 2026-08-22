/* Web Push handlers — được nạp vào service worker qua workbox.importScripts.
   Hiển thị thông báo đẩy (PWA mobile) + mở đúng màn khi bấm. */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'PickleFund', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'PickleFund'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/member/notifications' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/member/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(target).catch(() => {})
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})
