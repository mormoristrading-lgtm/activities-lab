import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { StrengthEntry } from '../../db/types'
import { BENCHMARKS } from '../../lib/muscles'
import Card from '../../components/Card'
import { Label, NumberField } from '../../components/Field'

type Local = Record<number, { kg: number | null; reps: number | null }>

/** Lab card: benchmark lifts → feeds the Strength view of the muscle map. */
export default function StrengthReport() {
  const saved = useLiveQuery(async () => {
    const row = await db.settings.get('strengthReport')
    return (row?.value as StrengthEntry[]) ?? []
  }, [])
  const bodyweight = useLiveQuery(async () => {
    const all = await db.dailyLog.toArray()
    return (
      all
        .filter((d) => d.bodyweight_kg != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1)?.bodyweight_kg ?? null
    )
  }, [])

  // Local mirror so the kg/reps inputs stay responsive (not bound to the DB round-trip).
  const [local, setLocal] = useState<Local | null>(null)
  useEffect(() => {
    if (saved && local == null) {
      const m: Local = {}
      for (const e of saved) m[e.exerciseId] = { kg: e.kg, reps: e.reps }
      setLocal(m)
    }
  }, [saved, local])

  if (!local) return null

  async function persist(next: Local) {
    const arr: StrengthEntry[] = Object.entries(next)
      .filter(([, v]) => v.kg != null && v.reps != null && v.kg! > 0 && v.reps! > 0)
      .map(([id, v]) => {
        const b = BENCHMARKS.find((x) => x.exerciseId === Number(id))
        return { exerciseId: Number(id), kg: v.kg!, reps: v.reps!, addBodyweight: b?.addBodyweight }
      })
    await db.settings.put({ key: 'strengthReport', value: arr })
  }

  const set = (id: number, patch: Partial<{ kg: number | null; reps: number | null }>) => {
    const cur = local[id] ?? { kg: null, reps: null }
    const next: Local = { ...local, [id]: { ...cur, ...patch } }
    setLocal(next)
    void persist(next)
  }

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-base font-semibold">Strength report</h2>
      <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
        Enter the best set you can do for each lift (weight × reps). I estimate your 1RM and score each
        muscle's strength on the <span style={{ color: 'var(--text)' }}>Progress → Muscles</span> map.
        {bodyweight != null
          ? ` Using bodyweight ${bodyweight} kg for the standards.`
          : ' Log your bodyweight (Progress) for absolute strength levels.'}
      </p>

      <div className="space-y-3">
        {BENCHMARKS.map((b) => (
          <div key={b.exerciseId} className="grid grid-cols-[1fr_5rem_5rem] items-end gap-2">
            <div className="min-w-0">
              <span className="block truncate text-sm" style={{ color: 'var(--text)' }}>
                {b.label}
              </span>
              {b.addBodyweight && (
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  added load (+ bodyweight)
                </span>
              )}
            </div>
            <div>
              <Label>kg</Label>
              <NumberField
                value={local[b.exerciseId]?.kg ?? null}
                step={2.5}
                onChange={(v) => set(b.exerciseId, { kg: v })}
                ariaLabel={`${b.label} weight`}
              />
            </div>
            <div>
              <Label>reps</Label>
              <NumberField
                value={local[b.exerciseId]?.reps ?? null}
                onChange={(v) => set(b.exerciseId, { reps: v })}
                ariaLabel={`${b.label} reps`}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
