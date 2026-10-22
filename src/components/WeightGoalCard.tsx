import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { updateDaily } from '../lib/daily'
import Card from './Card'
import Modal from './Modal'
import { Label, NumberField } from './Field'

/** Baseline for the progress bar's 0% end, so the bar reads 0% at your starting weight. */
const START_WEIGHT_KG = 65

/** Simple "current → target" bodyweight tracker — one number to log, one number to aim for. */
export default function WeightGoalCard() {
  const data = useLiveQuery(async () => {
    const rows = await db.dailyLog.orderBy('date').toArray()
    const latest = rows.slice().reverse().find((r) => r.bodyweight_kg != null)?.bodyweight_kg ?? null
    const target = await db.settings.get('weightGoalKg')
    return { latest, target: typeof target?.value === 'number' ? target.value : 70 }
  }, [])

  const [input, setInput] = useState<number | null>(null)
  const [editingTarget, setEditingTarget] = useState(false)

  if (!data) return null
  const { latest, target } = data

  const current = latest ?? START_WEIGHT_KG
  const span = target - START_WEIGHT_KG
  const pct = span !== 0 ? Math.max(0, Math.min(100, ((current - START_WEIGHT_KG) / span) * 100)) : 0

  async function save() {
    if (input == null) return
    await updateDaily(() => ({ bodyweight_kg: input }))
    setInput(null)
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Weight goal</h2>
        <button type="button" onClick={() => setEditingTarget(true)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          Edit target
        </button>
      </div>
      <div className="flex items-baseline justify-between text-sm">
        <span style={{ color: 'var(--text)' }}>{latest != null ? `${latest} kg` : 'No weigh-in yet'}</span>
        <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
          → {target} kg
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full" style={{ background: 'var(--track)' }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: 'var(--accent-2)', transition: 'width .3s' }} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <Label>Log today's weight (kg)</Label>
          <NumberField value={input} step={0.1} onChange={setInput} ariaLabel="Today's bodyweight" />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={input == null}
          className="rounded-card-sm px-4 py-2 text-sm font-semibold disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          Save
        </button>
      </div>

      {editingTarget && <TargetEditor current={target} onClose={() => setEditingTarget(false)} />}
    </Card>
  )
}

function TargetEditor({ current, onClose }: { current: number; onClose: () => void }) {
  const [v, setV] = useState<number | null>(current)

  async function save() {
    if (v == null) return
    await db.settings.put({ key: 'weightGoalKg', value: v })
    onClose()
  }

  return (
    <Modal
      title="Edit weight goal"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-card-sm border py-2.5 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>
            Cancel
          </button>
          <button type="button" onClick={save} className="flex-1 rounded-card-sm py-2.5 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            Save
          </button>
        </div>
      }
    >
      <Label>Target weight (kg)</Label>
      <NumberField value={v} step={0.5} onChange={setV} ariaLabel="Target weight" />
    </Modal>
  )
}
