import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { DailyLog, LoggedMeal, MealPreset, MealSlot, Nutrition } from '../db/types'
import { todayISO } from '../lib/date'
import { addMeal, removeMeal, updateDaily } from '../lib/daily'
import Card from '../components/Card'
import Modal from '../components/Modal'
import Screen from '../components/Screen'
import { IconButton, Label, NumberField, SelectField, TextField } from '../components/Field'

const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Shake', 'Snack']

export default function Fuel() {
  const data = useLiveQuery(async () => {
    const nutrition = await db.nutrition.get('targets')
    const daily = await db.dailyLog.get(todayISO())
    const presets = await db.mealPresets.orderBy('id').toArray()
    return { nutrition, daily, presets }
  }, [])

  const [editTargets, setEditTargets] = useState(false)
  const [editPresets, setEditPresets] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  if (!data?.nutrition) {
    return (
      <Screen eyebrow="Fuel" title="Fuel">
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </Screen>
    )
  }

  const { nutrition, daily, presets } = data
  const meals = daily?.meals ?? []

  const macros = [
    { label: 'Calories', val: daily?.calories ?? 0, target: nutrition.calories, unit: '', color: 'var(--accent)' },
    { label: 'Protein', val: daily?.protein_g ?? 0, target: nutrition.protein_g, unit: 'g', color: 'var(--good)' },
    { label: 'Carbs', val: daily?.carbs_g ?? 0, target: nutrition.carbs_g, unit: 'g', color: 'var(--accent-2)' },
    { label: 'Fat', val: daily?.fat_g ?? 0, target: nutrition.fat_g, unit: 'g', color: 'var(--muted)' },
  ]

  const water = daily?.water_l ?? 0
  const waterPct = nutrition.water_l ? Math.min(100, (water / nutrition.water_l) * 100) : 0

  return (
    <Screen eyebrow="Fuel" title="Fuel">
      {/* Macros */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Today vs target</h2>
          <button
            type="button"
            onClick={() => setEditTargets(true)}
            className="text-xs font-medium"
            style={{ color: 'var(--accent)' }}
          >
            Edit targets
          </button>
        </div>
        <div className="space-y-3">
          {macros.map((m) => (
            <Bar key={m.label} {...m} />
          ))}
        </div>
      </Card>

      {/* Water */}
      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Water</h2>
          <span className="text-sm tabular-nums" style={{ color: 'var(--dim)' }}>
            {water.toFixed(2)} / {nutrition.water_l} L
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full" style={{ background: 'var(--track)' }}>
          <div className="h-2 rounded-full" style={{ width: `${waterPct}%`, background: 'var(--accent-2)', transition: 'width .3s' }} />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => updateDaily((c) => ({ water_l: Math.max(0, (c.water_l ?? 0) - 0.25) }))} className="flex-1 rounded-card-sm border py-2 text-sm font-medium" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>
            − 0.25 L
          </button>
          <button type="button" onClick={() => updateDaily((c) => ({ water_l: (c.water_l ?? 0) + 0.25 }))} className="flex-1 rounded-card-sm py-2 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            + 0.25 L
          </button>
          <button type="button" onClick={() => updateDaily((c) => ({ water_l: (c.water_l ?? 0) + 0.5 }))} className="flex-1 rounded-card-sm py-2 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            + 0.5 L
          </button>
        </div>
      </Card>

      {/* Quick add */}
      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Quick add</h2>
          <button type="button" onClick={() => setEditPresets(true)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            Edit presets
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addMeal({ name: p.name, slot: p.slot, kcal: p.kcal, protein_g: p.protein_g, carbs_g: p.carbs_g, fat_g: p.fat_g })}
              className="rounded-card-sm border p-3 text-left"
              style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
            >
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {p.name}
              </div>
              <div className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                {p.kcal} kcal · {p.protein_g}P {p.carbs_g}C {p.fat_g}F
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="rounded-card-sm border border-dashed p-3 text-sm font-medium"
            style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}
          >
            + Custom
          </button>
        </div>
      </Card>

      {/* Today's meals */}
      {meals.length > 0 && (
        <Card className="mt-4 p-4">
          <h2 className="mb-2 text-base font-semibold">Today's meals</h2>
          <ul className="space-y-2">
            {meals.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm" style={{ color: 'var(--text)' }}>
                    {m.name}
                  </div>
                  <div className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                    {m.kcal} kcal · {m.protein_g}P {m.carbs_g}C {m.fat_g}F
                  </div>
                </div>
                <IconButton label={`Remove ${m.name}`} onClick={() => removeMeal(m.id)}>
                  ×
                </IconButton>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Supplements */}
      <Card className="mt-4 p-4">
        <h2 className="mb-2 text-base font-semibold">Supplements</h2>
        <ul className="space-y-1">
          {nutrition.supplements.map((sup) => {
            const checked = daily?.supplementsDone?.[sup] ?? false
            return (
              <li key={sup}>
                <label className="flex cursor-pointer items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const on = e.target.checked
                      updateDaily((c) => {
                        const supplementsDone = { ...(c.supplementsDone ?? {}), [sup]: on }
                        const patch: Partial<DailyLog> = { supplementsDone }
                        if (/creatine/i.test(sup)) patch.creatine = on
                        return patch
                      })
                    }}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>
                    {sup}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </Card>

      {editTargets && <TargetsEditor nutrition={nutrition} onClose={() => setEditTargets(false)} />}
      {editPresets && <PresetsEditor presets={presets} onClose={() => setEditPresets(false)} />}
      {customOpen && (
        <CustomMealForm
          onAdd={(meal) => {
            void addMeal(meal)
            setCustomOpen(false)
          }}
          onClose={() => setCustomOpen(false)}
        />
      )}
    </Screen>
  )
}

function Bar({ label, val, target, unit, color }: { label: string; val: number; target: number; unit: string; color: string }) {
  const pct = target ? Math.min(100, (val / target) * 100) : 0
  const over = val > target
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--dim)' }}>{label}</span>
        <span className="tabular-nums" style={{ color: over ? 'var(--accent)' : 'var(--muted)' }}>
          {Math.round(val)} / {target}
          {unit}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full" style={{ background: 'var(--track)' }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

// ── Targets editor ───────────────────────────────────────────────────────────
function TargetsEditor({ nutrition, onClose }: { nutrition: Nutrition; onClose: () => void }) {
  const [draft, setDraft] = useState<Nutrition>({ ...nutrition })
  const setNum = (k: keyof Nutrition) => (v: number | null) =>
    setDraft((d) => ({ ...d, [k]: v ?? 0 }) as Nutrition)

  const fields: { k: keyof Nutrition; label: string; step?: number }[] = [
    { k: 'calories', label: 'Calories', step: 10 },
    { k: 'protein_g', label: 'Protein (g)', step: 5 },
    { k: 'carbs_g', label: 'Carbs (g)', step: 5 },
    { k: 'fat_g', label: 'Fat (g)', step: 5 },
    { k: 'water_l', label: 'Water (L)', step: 0.25 },
    { k: 'creatine_g', label: 'Creatine (g)', step: 1 },
  ]

  async function save() {
    await db.nutrition.put(draft)
    onClose()
  }

  return (
    <Modal
      title="Edit targets"
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
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.k}>
            <Label>{f.label}</Label>
            <NumberField value={draft[f.k] as number} step={f.step} onChange={setNum(f.k)} ariaLabel={f.label} />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Label>Supplements</Label>
        <StringList
          items={draft.supplements}
          onChange={(supplements) => setDraft((d) => ({ ...d, supplements }))}
          placeholder="e.g. Creatine monohydrate 5g daily"
        />
      </div>
    </Modal>
  )
}

/** Editable list of text lines (add/remove/edit). */
function StringList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <TextField value={it} placeholder={placeholder} onChange={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} />
          <IconButton label="Remove line" onClick={() => onChange(items.filter((_, k) => k !== i))}>
            ×
          </IconButton>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
        + Add
      </button>
    </div>
  )
}

// ── Presets editor ───────────────────────────────────────────────────────────
type DraftPreset = Omit<MealPreset, 'id'>

function PresetsEditor({ presets, onClose }: { presets: MealPreset[]; onClose: () => void }) {
  const [rows, setRows] = useState<DraftPreset[]>(
    presets.map((p) => ({
      name: p.name,
      slot: p.slot,
      kcal: p.kcal,
      protein_g: p.protein_g,
      carbs_g: p.carbs_g,
      fat_g: p.fat_g,
    })),
  )

  const update = (i: number, patch: Partial<DraftPreset>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  const remove = (i: number) => setRows((r) => r.filter((_, k) => k !== i))
  const add = () => setRows((r) => [...r, { name: '', slot: 'Snack', kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }])

  async function save() {
    await db.transaction('rw', db.mealPresets, async () => {
      await db.mealPresets.clear()
      await db.mealPresets.bulkAdd(rows.filter((r) => r.name.trim()))
    })
    onClose()
  }

  return (
    <Modal
      title="Edit meal presets"
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
              <TextField value={r.name} onChange={(v) => update(i, { name: v })} placeholder="Name" />
              <div className="w-28 shrink-0">
                <SelectField value={r.slot} onChange={(v) => update(i, { slot: v })} options={SLOTS.map((s) => ({ value: s, label: s }))} ariaLabel="Slot" />
              </div>
              <IconButton label="Remove preset" onClick={() => remove(i)}>
                ×
              </IconButton>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([['kcal', 'kcal'], ['protein_g', 'P'], ['carbs_g', 'C'], ['fat_g', 'F']] as const).map(([k, lab]) => (
                <div key={k}>
                  <Label>{lab}</Label>
                  <NumberField value={r[k]} onChange={(v) => update(i, { [k]: v ?? 0 } as Partial<DraftPreset>)} ariaLabel={`${r.name} ${lab}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={add} className="w-full rounded-card-sm border border-dashed py-2.5 text-sm font-medium" style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}>
          + Add preset
        </button>
      </div>
    </Modal>
  )
}

// ── Custom meal ──────────────────────────────────────────────────────────────
function CustomMealForm({ onAdd, onClose }: { onAdd: (m: Omit<LoggedMeal, 'id'>) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [slot, setSlot] = useState<MealSlot>('Snack')
  const [kcal, setKcal] = useState<number | null>(null)
  const [p, setP] = useState<number | null>(null)
  const [c, setC] = useState<number | null>(null)
  const [f, setF] = useState<number | null>(null)

  return (
    <Modal
      title="Custom meal"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onAdd({ name: name.trim(), slot, kcal: kcal ?? 0, protein_g: p ?? 0, carbs_g: c ?? 0, fat_g: f ?? 0 })}
          className="w-full rounded-card-sm py-2.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          Add meal
        </button>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <TextField value={name} onChange={setName} placeholder="Name" ariaLabel="Meal name" />
          <div className="w-28 shrink-0">
            <SelectField value={slot} onChange={setSlot} options={SLOTS.map((s) => ({ value: s, label: s }))} ariaLabel="Slot" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div><Label>kcal</Label><NumberField value={kcal} onChange={setKcal} ariaLabel="kcal" /></div>
          <div><Label>P</Label><NumberField value={p} onChange={setP} ariaLabel="Protein" /></div>
          <div><Label>C</Label><NumberField value={c} onChange={setC} ariaLabel="Carbs" /></div>
          <div><Label>F</Label><NumberField value={f} onChange={setF} ariaLabel="Fat" /></div>
        </div>
      </div>
    </Modal>
  )
}
