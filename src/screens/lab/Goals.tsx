import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Goal } from '../../db/types'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import { IconButton, Label, SelectField, TextField } from '../../components/Field'

export default function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const [editing, setEditing] = useState(false)
  if (!goals) return null

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Goals</h2>
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          Edit
        </button>
      </div>
      <ul className="space-y-3">
        {goals.map((g) => {
          const c = parseFloat(g.current)
          const t = parseFloat(g.target)
          // Skip the bar for time-format goals (e.g. "19:00") — a linear bar is meaningless there.
          const timeFmt = g.current.includes(':') || g.target.includes(':')
          const numeric = !timeFmt && Number.isFinite(c) && Number.isFinite(t) && t !== 0
          const pct = numeric ? Math.max(0, Math.min(100, (c / t) * 100)) : null
          const color = g.accent === 'sage' ? 'var(--accent-2)' : 'var(--accent)'
          return (
            <li key={g.id}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text)' }}>{g.label}</span>
                <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
                  {g.current || '—'}
                  {g.target ? ` → ${g.target}` : ''} {g.unit}
                </span>
              </div>
              {pct != null && (
                <div className="mt-1 h-1.5 rounded-full" style={{ background: 'var(--track)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width .3s' }} />
                </div>
              )}
            </li>
          )
        })}
        {goals.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--muted)' }}>
            No goals yet — tap Edit to add one.
          </li>
        )}
      </ul>
      {editing && <GoalsEditor goals={goals} onClose={() => setEditing(false)} />}
    </Card>
  )
}

type DraftGoal = Omit<Goal, 'id'>

function GoalsEditor({ goals, onClose }: { goals: Goal[]; onClose: () => void }) {
  const [rows, setRows] = useState<DraftGoal[]>(
    goals.map((g) => ({ label: g.label, current: g.current, target: g.target, unit: g.unit, accent: g.accent })),
  )
  const update = (i: number, patch: Partial<DraftGoal>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  const remove = (i: number) => setRows((r) => r.filter((_, k) => k !== i))
  const add = () => setRows((r) => [...r, { label: '', current: '', target: '', unit: '', accent: 'clay' }])

  async function save() {
    await db.transaction('rw', db.goals, async () => {
      await db.goals.clear()
      await db.goals.bulkAdd(rows.filter((r) => r.label.trim()))
    })
    onClose()
  }

  return (
    <Modal
      title="Edit goals"
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
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-card-sm border p-3" style={{ borderColor: 'var(--line)' }}>
            <div className="mb-2 flex gap-2">
              <TextField value={r.label} onChange={(v) => update(i, { label: v })} placeholder="Goal" />
              <IconButton label="Remove goal" onClick={() => remove(i)}>
                ×
              </IconButton>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Current</Label>
                <TextField value={r.current} onChange={(v) => update(i, { current: v })} />
              </div>
              <div>
                <Label>Target</Label>
                <TextField value={r.target} onChange={(v) => update(i, { target: v })} />
              </div>
              <div>
                <Label>Unit</Label>
                <TextField value={r.unit} onChange={(v) => update(i, { unit: v })} />
              </div>
            </div>
            <div className="mt-2">
              <Label>Accent</Label>
              <SelectField
                value={r.accent}
                onChange={(v) => update(i, { accent: v as 'clay' | 'sage' })}
                ariaLabel="Accent"
                options={[
                  { value: 'clay', label: 'Clay' },
                  { value: 'sage', label: 'Sage' },
                ]}
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="w-full rounded-card-sm border border-dashed py-2.5 text-sm font-medium" style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}>
          + Add goal
        </button>
      </div>
    </Modal>
  )
}
