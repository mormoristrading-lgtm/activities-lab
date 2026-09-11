import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { ReminderType } from '../../db/types'
import { enablePush, isPushSupported, isStandalone, uploadConfig } from '../../lib/push'
import Card from '../../components/Card'
import { Label, TextField } from '../../components/Field'

export default function Reminders() {
  const data = useLiveQuery(async () => {
    const reminders = await db.reminders.toArray()
    const pushWorkerUrl = ((await db.settings.get('pushWorkerUrl'))?.value as string) ?? ''
    const vapidPublicKey = ((await db.settings.get('vapidPublicKey'))?.value as string) ?? ''
    return { reminders, pushWorkerUrl, vapidPublicKey }
  }, [])

  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [localKey, setLocalKey] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  if (!data) return null
  const url = localUrl ?? data.pushWorkerUrl
  const key = localKey ?? data.vapidPublicKey
  const supported = isPushSupported()
  const standalone = isStandalone()

  async function saveConfig() {
    await db.settings.put({ key: 'pushWorkerUrl', value: url.trim() })
    await db.settings.put({ key: 'vapidPublicKey', value: key.trim() })
  }

  async function enable() {
    setBusy(true)
    setStatus('')
    try {
      await saveConfig()
      await enablePush(url, key)
      setStatus('Notifications enabled. Reminders will arrive on schedule.')
    } catch (e) {
      setStatus((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // After editing reminders, push the updated schedule to the Worker (best-effort).
  function reupload() {
    if (url.trim()) void uploadConfig(url).catch(() => {})
  }

  const updateReminder = (id: number, patch: { time?: string; message?: string; enabled?: boolean }) => {
    void db.reminders.update(id, patch).then(reupload)
  }

  return (
    <>
      <Card className="p-4">
        <h2 className="mb-1 text-base font-semibold">Notifications</h2>
        <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
          Optional. Deploy the push Worker (see <code>workers/push/README.md</code>), then paste its
          URL + VAPID public key and enable. The app works fully without this.
        </p>

        {!standalone && (
          <p className="mb-2 rounded-card-sm px-3 py-2 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--dim)' }}>
            On iPhone, notifications only work after you <strong>Add to Home Screen</strong> and open
            the app from that icon (iOS 16.4+).
          </p>
        )}

        <div className="space-y-2">
          <div>
            <Label>Push Worker URL</Label>
            <TextField value={url} onChange={setLocalUrl} placeholder="https://…workers.dev" ariaLabel="Push Worker URL" />
          </div>
          <div>
            <Label>VAPID public key</Label>
            <TextField value={key} onChange={setLocalKey} placeholder="BPx…" ariaLabel="VAPID public key" />
          </div>
        </div>
        <button
          type="button"
          onClick={enable}
          disabled={busy || !supported}
          className="mt-3 w-full rounded-card-sm py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {supported ? 'Enable notifications' : 'Push not supported here'}
        </button>
        {status && (
          <p className="mt-2 text-sm" role="status" style={{ color: 'var(--dim)' }}>
            {status}
          </p>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-base font-semibold">Reminders</h2>
        <ul className="space-y-2">
          {data.reminders.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => updateReminder(r.id!, { enabled: e.target.checked })}
                aria-label={`${r.message} enabled`}
                className="h-5 w-5 shrink-0 accent-[var(--accent)]"
              />
              <input
                type="time"
                defaultValue={r.time}
                onBlur={(e) => updateReminder(r.id!, { time: e.target.value })}
                aria-label={`${labelFor(r.type)} time`}
                className="w-24 shrink-0 rounded-[10px] border px-2 py-1.5 text-sm tabular-nums"
                style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
              <input
                type="text"
                defaultValue={r.message}
                onBlur={(e) => updateReminder(r.id!, { message: e.target.value })}
                aria-label="Reminder message"
                className="min-w-0 flex-1 rounded-[10px] border px-2 py-1.5 text-sm"
                style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)', opacity: r.enabled ? 1 : 0.5 }}
              />
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

function labelFor(t: ReminderType): string {
  return t
}
