import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { resetToSeed } from '../../db/seed'
import { exportBackup, importBackup, shareBackup } from '../../lib/backup'
import { DEFAULT_ZOOM, isThemeName, MAX_ZOOM, MIN_ZOOM, THEMES, type ThemeName } from '../../lib/theme'
import Card from '../../components/Card'
import { Label, SelectField, TextField } from '../../components/Field'

async function putSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

export default function Settings() {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-base font-semibold">Settings</h2>
      <SettingsBody />
    </Card>
  )
}

/** Settings form body — reusable inside a Card (Lab) or a Modal (cog launcher). */
export function SettingsBody() {
  const settings = useLiveQuery(async () => {
    const rows = await db.settings.toArray()
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>
  }, [])

  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  // Local mirror so typing stays responsive (the input isn't bound to the async DB round-trip).
  const [name, setName] = useState<string | null>(null)

  if (!settings) return null

  const profile = (settings.profile as { name?: string }) ?? {}
  const units = (settings.units as string) ?? 'metric'
  const theme: ThemeName = isThemeName(settings.theme) ? settings.theme : 'terra'
  const zoom = typeof settings.zoomPercent === 'number' ? settings.zoomPercent : DEFAULT_ZOOM
  const restNotif = settings.restNotifications !== false // default on

  async function onExport() {
    setBusy(true)
    setStatus('')
    try {
      await exportBackup()
      setStatus('Backup downloaded.')
    } catch (e) {
      setStatus('Export failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onShare() {
    setBusy(true)
    setStatus('')
    try {
      await shareBackup()
      setStatus('Backup ready — save it somewhere safe.')
    } catch (e) {
      setStatus('Share failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onImportFile(file: File) {
    if (!confirm('Import will REPLACE all current data with the backup. Continue?')) return
    setBusy(true)
    setStatus('Importing…')
    try {
      await importBackup(file)
      setStatus('Imported. Reloading…')
      setTimeout(() => location.reload(), 600)
    } catch (e) {
      setStatus('Import failed: ' + (e as Error).message)
      setBusy(false)
    }
  }

  async function onReset() {
    if (!confirm('Reset program, targets, goals, reminders and motivation to the original seed? Your logs are kept.')) return
    setBusy(true)
    setStatus('Resetting…')
    try {
      await resetToSeed(db)
      setStatus('Reset to seed.')
    } catch (e) {
      setStatus('Reset failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <Label>Name</Label>
          <TextField
            value={name ?? profile.name ?? ''}
            onChange={(v) => {
              setName(v)
              void putSetting('profile', { ...profile, name: v })
            }}
            placeholder="Your name"
            ariaLabel="Profile name"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Units</Label>
            <SelectField
              value={units}
              onChange={(v) => putSetting('units', v)}
              ariaLabel="Units"
              options={[
                { value: 'metric', label: 'Metric (kg)' },
                { value: 'imperial', label: 'Imperial (lb)' },
              ]}
            />
          </div>
          <div>
            <Label>Theme</Label>
            <SelectField
              value={theme}
              onChange={(v) => putSetting('theme', v)}
              ariaLabel="Theme"
              options={THEMES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>
        </div>

        <div>
          <Label>Zoom · {zoom}%</Label>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={5}
            value={zoom}
            aria-label="Zoom percent"
            onChange={(e) => putSetting('zoomPercent', Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
            <span>{MIN_ZOOM}%</span>
            <button
              type="button"
              onClick={() => putSetting('zoomPercent', DEFAULT_ZOOM)}
              className="underline underline-offset-2"
            >
              reset to {DEFAULT_ZOOM}%
            </button>
            <span>{MAX_ZOOM}%</span>
          </div>
        </div>

        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text)' }}>Notify when rest ends</span>
            <input
              type="checkbox"
              checked={restNotif}
              onChange={(e) => putSetting('restNotifications', e.target.checked)}
              className="h-5 w-5 accent-[var(--accent)]"
            />
          </label>
          <NotificationStatus />
        </div>
      </div>

      <div className="my-4 border-t" style={{ borderColor: 'var(--line)' }} />

      <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--dim)' }}>
        Backup &amp; data
      </h3>
      <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
        All data is stored on this device — clearing the browser would erase it. Save a backup
        regularly (Share sends it to Files / iCloud / email).
      </p>
      <div className="mb-3">
        <Label>Backup reminder</Label>
        <SelectField
          value={(settings.backupCadence as string) ?? 'weekly'}
          onChange={(v) => putSetting('backupCadence', v)}
          ariaLabel="Backup reminder cadence"
          options={[
            { value: 'weekly', label: 'Remind me weekly' },
            { value: 'off', label: 'No reminders' },
          ]}
        />
      </div>
      <div className="space-y-2">
        <button type="button" onClick={onShare} disabled={busy} className="w-full rounded-card-sm py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
          Share / save backup
        </button>
        <button type="button" onClick={onExport} disabled={busy} className="w-full rounded-card-sm border py-2.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>
          Download backup (JSON)
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full rounded-card-sm border py-2.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>
          Import backup…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImportFile(f)
            e.target.value = ''
          }}
        />
        <button type="button" onClick={onReset} disabled={busy} className="w-full rounded-card-sm border py-2.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}>
          Reset program to seed
        </button>
      </div>
      {status && (
        <p className="mt-3 text-sm" role="status" style={{ color: 'var(--dim)' }}>
          {status}
        </p>
      )}
    </>
  )
}

/** Tiny inline prompt to request Notification permission for the rest-end alert. */
function NotificationStatus() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  if (perm === 'unsupported') {
    return (
      <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
        Notifications aren't supported in this browser.
      </p>
    )
  }
  if (perm === 'granted') {
    return (
      <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
        Lock-screen notification will fire when rest ends.
      </p>
    )
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          const p = await Notification.requestPermission()
          setPerm(p)
        }}
        className="rounded-card-sm border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
      >
        Enable notifications
      </button>
      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
        Required for lock-screen rest alerts. On iOS install the PWA first.
      </span>
    </div>
  )
}
