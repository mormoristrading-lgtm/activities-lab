import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { parseLocalISO, todayISO } from '../lib/date'
import { shareBackup } from '../lib/backup'
import { computeStreaks } from '../lib/standards'
import { round1 } from '../lib/training'

interface Nudge {
  id: string
  text: string
  actionLabel?: string
  action?: () => void
}

/** Open-time banners on Today: weigh-in due, water short, streak at risk. */
export default function Nudges() {
  const data = useLiveQuery(async () => {
    const daily = await db.dailyLog.get(todayISO())
    const nutrition = await db.nutrition.get('targets')
    const defs = await db.standardsDef.orderBy('order').toArray()
    const logs = await db.standardsLog.toArray()
    const settings = Object.fromEntries((await db.settings.toArray()).map((r) => [r.key, r.value]))
    return { daily, nutrition, defs, logs, settings }
  }, [])

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  if (!data) return null

  const nudges: Nudge[] = []
  const hour = new Date().getHours()

  if (data.daily?.bodyweight_kg == null) {
    nudges.push({ id: 'weigh', text: 'Log your morning weigh-in.' })
  }

  const water = data.daily?.water_l ?? 0
  if (data.nutrition && hour >= 14 && water < data.nutrition.water_l * 0.5) {
    nudges.push({ id: 'water', text: `Water's behind — about ${round1(data.nutrition.water_l - water)} L to go today.` })
  }

  // single most-valuable streak at risk
  const streaks = computeStreaks(
    data.defs.map((d) => d.id!),
    data.logs,
  )
  let atRisk: { label: string; streak: number; id: number } | null = null
  for (const d of data.defs) {
    const info = streaks.get(d.id!)
    if (info && info.streak >= 2 && !info.doneToday && (!atRisk || info.streak > atRisk.streak)) {
      atRisk = { label: d.label, streak: info.streak, id: d.id! }
    }
  }
  if (atRisk) {
    nudges.push({ id: `streak-${atRisk.id}`, text: `Keep your ${atRisk.streak}-day ${atRisk.label} streak alive.` })
  }

  // Backup reminder — data is on-device only, so nudge to save a copy.
  const cadence = (data.settings.backupCadence as string) ?? 'weekly'
  if (cadence !== 'off') {
    const last = data.settings.lastBackupAt as string | undefined
    const daysSince = last
      ? Math.floor((parseLocalISO(todayISO()).getTime() - parseLocalISO(last).getTime()) / 86_400_000)
      : Infinity
    if (daysSince >= 7) {
      nudges.push({
        id: 'backup',
        text: last
          ? `Back up your data — last backup ${daysSince} days ago.`
          : 'Back up your data — you have no backup yet.',
        actionLabel: 'Back up',
        action: () => void shareBackup(),
      })
    }
  }

  const visible = nudges.filter((n) => !dismissed.has(n.id))
  if (visible.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {visible.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-2 rounded-card border-l-4 px-3 py-2.5 text-sm"
          style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}
        >
          <span className="flex-1" style={{ color: 'var(--text)' }}>
            {n.text}
          </span>
          {n.action && (
            <button
              type="button"
              onClick={n.action}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {n.actionLabel ?? 'Go'}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed((s) => new Set(s).add(n.id))}
            className="shrink-0 text-lg leading-none"
            style={{ color: 'var(--muted)' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
