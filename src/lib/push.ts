import { db } from '../db/db'

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/** Build the config the cron Worker needs and POST it to /config. */
export async function uploadConfig(workerUrl: string, sub?: PushSubscription | null): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const subscription = sub ?? (await reg.pushManager.getSubscription())
  if (!subscription) return // not subscribed yet — nothing to upload

  const reminders = (await db.reminders.toArray())
    .filter((r) => r.enabled)
    .map((r) => ({ id: r.id!, time: r.time, message: r.message }))
  const motivation = (await db.motivation.toArray()).filter((m) => m.enabled).map((m) => m.text)

  const body = JSON.stringify({
    subscription: subscription.toJSON(),
    reminders,
    motivation,
    // IANA zone is DST-correct; offset is a fallback.
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffsetMinutes: new Date().getTimezoneOffset(),
  })

  const res = await fetch(workerUrl.trim().replace(/\/+$/, '') + '/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
  if (!res.ok) throw new Error(`Worker returned ${res.status}`)
}

/** Request permission, subscribe to push, and upload the config. */
export async function enablePush(workerUrl: string, vapidPublicKey: string): Promise<void> {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this browser.')
  if (!vapidPublicKey.trim()) throw new Error('Enter your VAPID public key first.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const reg = await navigator.serviceWorker.ready
  const desiredKey = urlBase64ToUint8Array(vapidPublicKey.trim())

  // A subscription is bound to the VAPID key it was made with. If an existing one
  // used a different key (e.g. the Worker's keys were rotated), it must be replaced
  // or every push silently fails (403).
  let sub = await reg.pushManager.getSubscription()
  if (sub && !sameKey(sub.options.applicationServerKey, desiredKey)) {
    await sub.unsubscribe()
    sub = null
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: desiredKey })
  }

  await uploadConfig(workerUrl, sub)
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false
  const av = new Uint8Array(a)
  if (av.length !== b.length) return false
  for (let i = 0; i < av.length; i++) if (av[i] !== b[i]) return false
  return true
}
