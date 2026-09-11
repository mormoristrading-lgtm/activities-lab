import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { parseLocalISO, todayISO, toISO } from '../../lib/date'
import { round1 } from '../../lib/training'
import Card from '../../components/Card'

const avg = (arr: number[]) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null)

export default function WeeklyReview() {
  const data = useLiveQuery(async () => {
    const daily = await db.dailyLog.toArray()
    const workouts = await db.workoutLogs.toArray()
    const reviews = (await db.journal.toArray()).filter((j) => j.type === 'review')
    return { daily, workouts, reviews }
  }, [])

  const [energy, setEnergy] = useState(3)
  const [notes, setNotes] = useState('')

  if (!data) return null

  const today = todayISO()
  const daysAgo = (n: number) => {
    const d = parseLocalISO(today)
    d.setDate(d.getDate() - n)
    return toISO(d)
  }
  const wkStart = daysAgo(6)
  const lastStart = daysAgo(13)
  const lastEnd = daysAgo(7)

  const wThis = avg(data.daily.filter((d) => d.bodyweight_kg != null && d.date >= wkStart && d.date <= today).map((d) => d.bodyweight_kg!))
  const wLast = avg(data.daily.filter((d) => d.bodyweight_kg != null && d.date >= lastStart && d.date <= lastEnd).map((d) => d.bodyweight_kg!))
  const delta = wThis != null && wLast != null ? round1(wThis - wLast) : null
  const sessions = data.workouts.filter((w) => w.date >= wkStart && w.date <= today && w.entries.some((e) => e.sets.some((s) => s.done))).length

  const nudges: string[] = []
  if (delta != null) {
    if (delta > 0.6) nudges.push(`Bodyweight up ${delta} kg this week — if it's climbing faster than planned, trim ~200 kcal and protect leanness.`)
    else if (delta < -0.4) nudges.push(`Bodyweight down ${Math.abs(delta)} kg — eat a bit more to keep building while staying lean.`)
    else nudges.push(`Bodyweight stable (${delta >= 0 ? '+' : ''}${delta} kg) — on track for a slow recomp.`)
  }
  nudges.push(sessions >= 4 ? `${sessions} sessions logged — lifting is leading. Good.` : `Only ${sessions} session${sessions === 1 ? '' : 's'} logged this week — protect lifting; if run-down, cut CrossFit then a run.`)

  async function save() {
    await db.journal.add({ date: today, type: 'review', text: notes.trim(), energy })
    setNotes('')
    setEnergy(3)
  }

  const pastReviews = data.reviews.slice().sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Card className="p-4">
      <h2 className="text-base font-semibold">Weekly review</h2>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Stat label="This week" value={wThis != null ? `${round1(wThis)} kg` : '—'} />
        <Stat label="Δ vs last" value={delta != null ? `${delta >= 0 ? '+' : ''}${delta} kg` : '—'} />
        <Stat label="Sessions" value={`${sessions}`} />
      </div>

      <ul className="mt-3 space-y-1.5">
        {nudges.map((n, i) => (
          <li key={i} className="rounded-card-sm px-3 py-2 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--dim)' }}>
            {n}
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium" style={{ color: 'var(--dim)' }}>
          Energy this week
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEnergy(n)}
              className="h-9 flex-1 rounded-card-sm border text-sm font-semibold tabular-nums"
              style={{
                borderColor: energy === n ? 'var(--accent)' : 'var(--line)',
                background: energy === n ? 'var(--accent)' : 'transparent',
                color: energy === n ? 'var(--on-accent)' : 'var(--dim)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notes — what went well, what to change…"
        className="mt-3 w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
      />
      <button type="button" onClick={save} className="mt-2 w-full rounded-card-sm py-2.5 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
        Save review
      </button>

      {pastReviews.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
            Past reviews
          </p>
          <ul className="space-y-2">
            {pastReviews.map((r) => (
              <li key={r.id} className="rounded-card-sm border p-3" style={{ borderColor: 'var(--line)' }}>
                <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
                  <span>{r.date}</span>
                  <span>energy {r.energy}/5</span>
                </div>
                {r.text && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--text)' }}>
                    {r.text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card-sm border p-2" style={{ borderColor: 'var(--line)' }}>
      <div className="text-[11px]" style={{ color: 'var(--dim)' }}>
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}
