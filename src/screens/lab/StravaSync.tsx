import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { syncStrava } from '../../lib/strava'
import Card from '../../components/Card'
import { Label, TextField } from '../../components/Field'

export default function StravaSync() {
  const saved = useLiveQuery(async () => ((await db.settings.get('stravaWorkerUrl'))?.value as string) ?? '', [])
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  if (saved === undefined) return null
  const value = localUrl ?? saved

  async function persist() {
    await db.settings.put({ key: 'stravaWorkerUrl', value: value.trim() })
  }

  async function sync() {
    if (!value.trim()) {
      setStatus('Paste your Worker URL first.')
      return
    }
    setBusy(true)
    setStatus('Syncing…')
    try {
      await persist()
      const { added, skipped } = await syncStrava(value)
      setStatus(`Synced — ${added} new run${added === 1 ? '' : 's'}, ${skipped} already imported.`)
    } catch (e) {
      setStatus('Sync failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-base font-semibold">Strava</h2>
      <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
        Optional. Deploy the Worker (see <code>workers/strava/README.md</code>), paste its URL, and
        import your runs. Your data stays on-device; the app works fully without this.
      </p>
      <Label>Worker URL</Label>
      <TextField value={value} onChange={setLocalUrl} placeholder="https://…workers.dev" ariaLabel="Strava Worker URL" />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void persist().then(() => setStatus('Saved.'))} disabled={busy} className="flex-1 rounded-card-sm border py-2.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>
          Save
        </button>
        <button type="button" onClick={sync} disabled={busy} className="flex-1 rounded-card-sm py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
          Sync now
        </button>
      </div>
      {status && (
        <p className="mt-2 text-sm" role="status" style={{ color: 'var(--dim)' }}>
          {status}
        </p>
      )}
    </Card>
  )
}
