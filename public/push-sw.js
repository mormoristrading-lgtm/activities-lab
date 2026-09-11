// Imported into the generated service worker (vite-plugin-pwa workbox.importScripts).
// Handles incoming Web Push messages + notification taps. iOS requires the PWA to
// be installed to the Home Screen (iOS 16.4+) for push to work.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text() }
  }
  const title = data.title || 'Activities Lab'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'activities-lab',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    }),
  )
})

// ── Local rest-end notification ─────────────────────────────────────────────
// The SessionLogger postMessages the SW when the user starts a rest. The SW
// queues a setTimeout that fires showNotification when rest is up, so the
// notification surfaces on the device lock screen even if the user has put
// the phone away. Caveat: iOS Safari can throttle/terminate the SW after
// long idle periods — reliable for 60–180s rests, less so for very long ones.
let restTimer = null
function clearRestTimer() {
  if (restTimer != null) {
    clearTimeout(restTimer)
    restTimer = null
  }
}
self.addEventListener('message', (event) => {
  const d = event.data
  if (!d || typeof d !== 'object') return
  if (d.type === 'schedule-rest-end' && typeof d.seconds === 'number' && d.seconds > 0) {
    clearRestTimer()
    const exerciseName = typeof d.exerciseName === 'string' ? d.exerciseName : ''
    restTimer = setTimeout(() => {
      restTimer = null
      self.registration.showNotification('Rest done', {
        body: exerciseName ? `Next set: ${exerciseName}` : 'Time for your next set.',
        tag: 'rest-end',
        renotify: true,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      })
    }, d.seconds * 1000)
  } else if (d.type === 'cancel-rest-end') {
    clearRestTimer()
    self.registration.getNotifications({ tag: 'rest-end' }).then((ns) => ns.forEach((n) => n.close()))
  }
})
