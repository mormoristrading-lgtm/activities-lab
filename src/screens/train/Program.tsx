import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type {
  DayKey,
  DaySlot,
  Exercise,
  ExerciseCategory,
  LibraryExercise,
  RunType,
  Session,
  SessionItem,
  SlotType,
  TrainingGoal,
  WeekPlanDay,
} from '../../db/types'
import datasetUrl from '../../data/exercises.json?url'
import { RUNNING_DRILLS } from '../../data/running-drills'
import { DAY_ORDER } from '../../lib/date'
import { ensureExerciseFromLibrary, LIB_IMG_BASE } from '../../lib/library'
import { GOAL_LABELS, goalForReps, repsForGoal } from '../../lib/training'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import ExerciseThumb from '../../components/ExerciseThumb'
import LikeButton from '../../components/LikeButton'
import { IconButton, Label, NumberField, SelectField, TextField } from '../../components/Field'

const SLOT_LABEL: Record<SlotType, string> = {
  gym: 'Gym',
  calisthenics: 'Calisthenics',
  crossfit: 'CrossFit',
  run: 'Run',
  mobility: 'Mobility',
  rest: 'Rest',
  other: 'Other',
}

const SLOT_OPTIONS = (Object.keys(SLOT_LABEL) as SlotType[]).map((t) => ({ value: t, label: SLOT_LABEL[t] }))

/** One-line summary of a slot for the weekly schedule. */
function describeSlot(slot: DaySlot, sessionByKey: Map<string, Session>): string {
  const usesSession = ['gym', 'calisthenics', 'crossfit'].includes(slot.type)
  const title =
    usesSession && slot.sessionKey
      ? (sessionByKey.get(slot.sessionKey)?.title ?? slot.sessionKey)
      : slot.text || SLOT_LABEL[slot.type]
  const mins = slot.minutes != null ? ` · ~${slot.minutes}m` : ''
  return `${SLOT_LABEL[slot.type]}: ${title}${mins}`
}

/** Join a session's activities into one line, e.g. "Run: … + Calisthenics: …". */
function describeSlots(slots: DaySlot[], sessionByKey: Map<string, Session>): string {
  return slots.map((s) => describeSlot(s, sessionByKey)).join('  +  ')
}

export default function Program() {
  const week = useLiveQuery(() => db.weekPlan.toArray(), [])
  const sessions = useLiveQuery(() => db.sessions.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  const [editDay, setEditDay] = useState<DayKey | null>(null)
  const [editSessionId, setEditSessionId] = useState<number | null>(null)

  if (!week || !sessions || !exercises) return <p style={{ color: 'var(--muted)' }}>Loading…</p>

  const byDay = new Map(week.map((d) => [d.day, d]))
  const sessionByKey = new Map(sessions.map((s) => [s.key, s]))
  const exById = new Map(exercises.map((e) => [e.id!, e]))

  const editingDay = editDay ? byDay.get(editDay) : null
  const editingSession = editSessionId ? sessions.find((s) => s.id === editSessionId) : null

  return (
    <div className="space-y-5">
      {/* Weekly schedule */}
      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
          This week
        </h2>
        <div className="space-y-2">
          {DAY_ORDER.map((day) => {
            const d = byDay.get(day)
            if (!d) return null
            const amLabel = d.am.length ? describeSlots(d.am, sessionByKey) : d.isRest ? 'Rest' : '—'
            const pmLabel = d.pm.length ? describeSlots(d.pm, sessionByKey) : ''
            return (
              <Card key={day} className="flex items-center gap-3 p-3">
                <div className="w-10 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  {day}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm" style={{ color: 'var(--text)' }}>
                    {amLabel}
                  </div>
                  <div className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                    {pmLabel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditDay(day)}
                  className="shrink-0 rounded-[9px] border px-3 py-1.5 text-xs"
                  style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
                >
                  Edit
                </button>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Sessions */}
      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
          Sessions
        </h2>
        <div className="space-y-2">
          {sessions.map((s) => {
            const thumbs = s.items.slice(0, 3).map((it) => exById.get(it.exerciseId)?.image).filter(Boolean) as string[]
            return (
              <Card key={s.id} className="flex items-center gap-3 p-3">
                <div className="flex shrink-0 -space-x-2">
                  {thumbs.length === 0 ? (
                    <ExerciseThumb size="h-9 w-9" />
                  ) : (
                    thumbs.map((src, i) => (
                      <ExerciseThumb key={i} src={src} size="h-9 w-9" rounded="rounded-full" className="ring-2 ring-[var(--surface)]" />
                    ))
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {s.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {s.items.length} exercises · {s.items.reduce((n, i) => n + i.sets, 0)} sets
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditSessionId(s.id!)}
                  className="shrink-0 rounded-[9px] border px-3 py-1.5 text-xs"
                  style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
                >
                  Edit
                </button>
              </Card>
            )
          })}
        </div>
      </section>

      {editingDay && (
        <DayEditor
          day={editingDay}
          sessions={sessions}
          exercises={exercises}
          exById={exById}
          onClose={() => setEditDay(null)}
        />
      )}
      {editingSession && (
        <SessionEditor
          key={editingSession.id}
          session={editingSession}
          exercises={exercises}
          exById={exById}
          onClose={() => setEditSessionId(null)}
        />
      )}
    </div>
  )
}

// ── Day editor ───────────────────────────────────────────────────────────────
const RUN_OPTIONS = [
  { value: 'easy', label: 'Easy + strides' },
  { value: 'interval', label: 'VO2 intervals' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'long', label: 'Long run' },
]

/** Editor for one activity within a session. */
function SlotFields({
  label,
  slot,
  sessions,
  onChange,
  onRemove,
  onNewSession,
  onEditSession,
}: {
  label: string
  slot: DaySlot
  sessions: Session[]
  onChange: (s: DaySlot) => void
  onRemove: () => void
  onNewSession: () => void
  onEditSession: () => void
}) {
  const sessionOptions = [
    { value: '', label: 'None' },
    ...sessions.map((s) => ({ value: s.key, label: s.title })),
    { value: '__new__', label: '+ New session…' },
  ]
  const patch = (p: Partial<DaySlot>) => onChange({ ...slot, ...p })
  const usesSession = ['gym', 'calisthenics', 'crossfit'].includes(slot.type)

  return (
    <div className="space-y-3 rounded-card-sm border p-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SelectField
            ariaLabel={`${label} type`}
            value={slot.type}
            onChange={(v) => patch({ type: v as SlotType })}
            options={SLOT_OPTIONS}
          />
        </div>
        <IconButton label="Remove activity" onClick={onRemove}>
          ×
        </IconButton>
      </div>
      {usesSession && (
        <>
          <SelectField
            ariaLabel={`${label} session`}
            value={slot.sessionKey ?? ''}
            onChange={(v) =>
              v === '__new__' ? onNewSession() : patch({ sessionKey: v === '' ? null : v })
            }
            options={sessionOptions}
          />
          {slot.sessionKey && (
            <button
              type="button"
              onClick={onEditSession}
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              Edit exercises ›
            </button>
          )}
        </>
      )}
      {slot.type === 'run' && (
        <SelectField
          ariaLabel={`${label} run`}
          value={slot.runType ?? 'easy'}
          onChange={(v) => patch({ runType: v as RunType })}
          options={RUN_OPTIONS}
        />
      )}
      <TextField
        value={slot.text ?? ''}
        onChange={(v) => patch({ text: v })}
        placeholder="Description (optional)"
        ariaLabel={`${label} description`}
      />
      <div className="flex items-center gap-2">
        <div className="w-24">
          <NumberField
            value={slot.minutes ?? null}
            step={5}
            onChange={(v) => patch({ minutes: v ?? undefined })}
            ariaLabel={`${label} minutes`}
          />
        </div>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          min (estimated)
        </span>
      </div>
    </div>
  )
}

/** A session (morning/afternoon) = an ordered list of activities. */
function SessionSlots({
  label,
  slots,
  sessions,
  onChange,
  onNewSession,
  onEditSession,
}: {
  label: string
  slots: DaySlot[]
  sessions: Session[]
  onChange: (slots: DaySlot[]) => void
  onNewSession: (idx: number, slot: DaySlot) => void
  onEditSession: (slot: DaySlot) => void
}) {
  const update = (idx: number, s: DaySlot) => onChange(slots.map((x, i) => (i === idx ? s : x)))
  const remove = (idx: number) => onChange(slots.filter((_, i) => i !== idx))
  const add = () => onChange([...slots, { type: 'gym' }])

  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2">
        {slots.map((slot, idx) => (
          <SlotFields
            key={idx}
            label={label}
            slot={slot}
            sessions={sessions}
            onChange={(s) => update(idx, s)}
            onRemove={() => remove(idx)}
            onNewSession={() => onNewSession(idx, slot)}
            onEditSession={() => onEditSession(slot)}
          />
        ))}
        <button
          type="button"
          onClick={add}
          className="w-full rounded-card-sm border border-dashed py-2 text-sm font-medium"
          style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}
        >
          + Add activity
        </button>
      </div>
    </div>
  )
}

function DayEditor({
  day,
  sessions,
  exercises,
  exById,
  onClose,
}: {
  day: WeekPlanDay
  sessions: Session[]
  exercises: Exercise[]
  exById: Map<number, Exercise>
  onClose: () => void
}) {
  const [draft, setDraft] = useState<WeekPlanDay>({ ...day })
  const [editing, setEditing] = useState<Session | null>(null)
  const set = <K extends keyof WeekPlanDay>(k: K, v: WeekPlanDay[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  async function save() {
    await db.weekPlan.put(draft)
    onClose()
  }

  // Create a fresh session for the activity at (which, idx), or edit its current one.
  async function newSessionFor(which: 'am' | 'pm', idx: number, slot: DaySlot) {
    const key = `custom-${Date.now()}`
    const title = `${SLOT_LABEL[slot.type]} session · ${day.day}`
    const order = sessions.reduce((m, s) => Math.max(m, s.order), 0) + 1
    const id = await db.sessions.add({ key, title, order, warmup: [], cooldown: [], items: [] })
    setDraft((d) => ({
      ...d,
      [which]: d[which].map((s, i) => (i === idx ? { ...s, sessionKey: key } : s)),
    }))
    setEditing({ id: id as number, key, title, order, warmup: [], cooldown: [], items: [] })
  }
  function editSessionFor(slot: DaySlot) {
    const s = sessions.find((x) => x.key === slot.sessionKey)
    if (s) setEditing(s)
  }

  return (
    <Modal
      title={`Edit ${day.day}`}
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
      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text)' }}>Rest day</span>
          <input
            type="checkbox"
            checked={draft.isRest}
            onChange={(e) => set('isRest', e.target.checked)}
            className="h-5 w-5 accent-[var(--accent)]"
          />
        </label>

        <SessionSlots
          label="Morning"
          slots={draft.am}
          sessions={sessions}
          onChange={(slots) => set('am', slots)}
          onNewSession={(idx, slot) => newSessionFor('am', idx, slot)}
          onEditSession={editSessionFor}
        />
        <SessionSlots
          label="Afternoon"
          slots={draft.pm}
          sessions={sessions}
          onChange={(slots) => set('pm', slots)}
          onNewSession={(idx, slot) => newSessionFor('pm', idx, slot)}
          onEditSession={editSessionFor}
        />
      </div>

      {editing && (
        <SessionEditor
          key={editing.id}
          session={editing}
          exercises={exercises}
          exById={exById}
          onClose={() => setEditing(null)}
        />
      )}
    </Modal>
  )
}

// ── Session editor ───────────────────────────────────────────────────────────
function SessionEditor({
  session,
  exercises,
  exById,
  onClose,
}: {
  session: Session
  exercises: Exercise[]
  exById: Map<number, Exercise>
  onClose: () => void
}) {
  const [title, setTitle] = useState(session.title)
  const [warmup, setWarmup] = useState<string[]>([...session.warmup])
  const [cooldown, setCooldown] = useState<string[]>([...session.cooldown])
  const [items, setItems] = useState<SessionItem[]>(session.items.map((i) => ({ ...i })))
  const [picking, setPicking] = useState(false)
  // Per-exercise working-weight targets (stored on the Exercise, not the item).
  const [targets, setTargets] = useState<Record<number, { weight: number | null; reps: number | null }>>(
    () => {
      const m: Record<number, { weight: number | null; reps: number | null }> = {}
      for (const it of session.items) {
        const ex = exById.get(it.exerciseId)
        m[it.exerciseId] = { weight: ex?.targetWeight ?? null, reps: ex?.targetReps ?? null }
      }
      return m
    },
  )
  const setTarget = (exerciseId: number, patch: Partial<{ weight: number | null; reps: number | null }>) =>
    setTargets((t) => ({ ...t, [exerciseId]: { ...t[exerciseId], ...patch } }))

  const updateItem = (idx: number, patch: Partial<SessionItem>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx))
  const move = (idx: number, dir: -1 | 1) =>
    setItems((arr) => {
      const j = idx + dir
      if (j < 0 || j >= arr.length) return arr
      const copy = [...arr]
      ;[copy[idx], copy[j]] = [copy[j], copy[idx]]
      return copy
    })

  async function save() {
    await db.sessions.update(session.id!, {
      title,
      warmup: warmup.filter((w) => w.trim()),
      cooldown: cooldown.filter((w) => w.trim()),
      items,
    })
    await Promise.all(
      Object.entries(targets).map(([id, t]) =>
        db.exercises.update(Number(id), { targetWeight: t.weight, targetReps: t.reps }),
      ),
    )
    onClose()
  }

  return (
    <Modal
      title="Edit session"
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
      <div className="space-y-5">
        <div>
          <Label>Title</Label>
          <TextField value={title} onChange={setTitle} ariaLabel="Session title" />
        </div>

        {/* Warmup */}
        <div>
          <Label>Warm-up</Label>
          <div className="space-y-2">
            {warmup.map((w, i) => (
              <div key={i} className="flex gap-2">
                <TextField value={w} onChange={(v) => setWarmup((a) => a.map((x, k) => (k === i ? v : x)))} />
                <IconButton label="Remove warm-up line" onClick={() => setWarmup((a) => a.filter((_, k) => k !== i))}>
                  ×
                </IconButton>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setWarmup((a) => [...a, ''])}
              className="text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              + Add warm-up line
            </button>
          </div>
        </div>

        {/* Cooldown */}
        <div>
          <Label>Post-session stretch</Label>
          <div className="space-y-2">
            {cooldown.map((w, i) => (
              <div key={i} className="flex gap-2">
                <TextField value={w} onChange={(v) => setCooldown((a) => a.map((x, k) => (k === i ? v : x)))} />
                <IconButton label="Remove stretch line" onClick={() => setCooldown((a) => a.filter((_, k) => k !== i))}>
                  ×
                </IconButton>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCooldown((a) => [...a, ''])}
              className="text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              + Add stretch line
            </button>
          </div>
        </div>

        {/* Exercises */}
        <div>
          <Label>Exercises</Label>
          <div className="space-y-3">
            {items.map((it, idx) => {
              const ex = exById.get(it.exerciseId)
              return (
                <div key={idx} className="rounded-card-sm border p-3" style={{ borderColor: 'var(--line)' }}>
                  <div className="mb-2 flex items-center gap-2">
                    <ExerciseThumb src={ex?.image} alt={ex?.name ?? ''} size="h-10 w-10" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {ex?.name ?? `Exercise #${it.exerciseId}`}
                    </span>
                    <LikeButton exerciseId={it.exerciseId} size="sm" />
                    <IconButton label="Move up" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</IconButton>
                    <IconButton label="Move down" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>↓</IconButton>
                    <IconButton label="Remove exercise" onClick={() => removeItem(idx)}>×</IconButton>
                  </div>
                  <div className="mb-2">
                    <Label>Goal</Label>
                    <SelectField
                      ariaLabel="Training goal"
                      value={it.goal ?? goalForReps(it.repLow, it.repHigh)}
                      onChange={(v) => updateItem(idx, { goal: v as TrainingGoal, ...repsForGoal(v as TrainingGoal) })}
                      options={GOAL_OPTIONS}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label>Sets</Label>
                      <NumberField value={it.sets} min={1} onChange={(v) => updateItem(idx, { sets: v ?? 1 })} ariaLabel="Sets" />
                    </div>
                    <div>
                      <Label>Rep low</Label>
                      <NumberField value={it.repLow} onChange={(v) => updateItem(idx, { repLow: v })} ariaLabel="Rep low" />
                    </div>
                    <div>
                      <Label>Rep high</Label>
                      <NumberField value={it.repHigh} onChange={(v) => updateItem(idx, { repHigh: v })} ariaLabel="Rep high" />
                    </div>
                    <div>
                      <Label>RPE</Label>
                      <TextField value={it.rpe} onChange={(v) => updateItem(idx, { rpe: v })} ariaLabel="RPE" />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <Label>Target weight (kg)</Label>
                      <NumberField
                        value={targets[it.exerciseId]?.weight ?? null}
                        step={2.5}
                        onChange={(v) => setTarget(it.exerciseId, { weight: v })}
                        ariaLabel="Target weight"
                      />
                    </div>
                    <div>
                      <Label>Target reps</Label>
                      <NumberField
                        value={targets[it.exerciseId]?.reps ?? null}
                        onChange={(v) => setTarget(it.exerciseId, { reps: v })}
                        ariaLabel="Target reps"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label>Note</Label>
                    <TextField value={it.note} onChange={(v) => updateItem(idx, { note: v })} placeholder="e.g. per leg" />
                  </div>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="w-full rounded-card-sm border border-dashed py-2.5 text-sm font-medium"
              style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}
            >
              + Add exercise
            </button>
          </div>
        </div>
      </div>

      {picking && (
        <ExercisePicker
          exercises={exercises}
          onPick={(exerciseId) => {
            setItems((a) => [...a, { exerciseId, sets: 3, repLow: 8, repHigh: 12, rpe: '8', note: '' }])
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </Modal>
  )
}

const GOAL_OPTIONS = (Object.keys(GOAL_LABELS) as TrainingGoal[]).map((g) => ({
  value: g,
  label: GOAL_LABELS[g],
}))

// ── Exercise picker (existing + create new) ──────────────────────────────────
const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'lower', label: 'Lower' },
  { value: 'upperPush', label: 'Upper push' },
  { value: 'upperPull', label: 'Upper pull' },
  { value: 'skill', label: 'Skill' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'mobility', label: 'Mobility' },
]

type PickerTab = 'liked' | 'library' | 'mine'

function ExercisePicker({
  exercises,
  onPick,
  onClose,
}: {
  exercises: Exercise[]
  onPick: (exerciseId: number) => void
  onClose: () => void
}) {
  const likedRows = exercises.filter((e) => e.liked === true)
  const initialTab: PickerTab = likedRows.length > 0 ? 'liked' : 'library'
  const [tab, setTab] = useState<PickerTab>(initialTab)
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState<ExerciseCategory>('accessory')
  const [lib, setLib] = useState<LibraryExercise[] | null>(null)
  const [libErr, setLibErr] = useState(false)

  // Lazy-load the 873-exercise Library the first time the tab is opened.
  useEffect(() => {
    if (tab !== 'library' || lib) return
    fetch(datasetUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: LibraryExercise[]) => setLib([...RUNNING_DRILLS, ...d]))
      .catch(() => setLibErr(true))
  }, [tab, lib])

  const q = query.trim().toLowerCase()
  const mine = exercises
    .filter((e) => e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
  const liked = likedRows
    .filter((e) => e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
  const libMatches = (lib ?? [])
    .filter((e) => e.name.toLowerCase().includes(q))
    .slice(0, 40)

  async function createNew() {
    const name = newName.trim()
    if (!name) return
    const id = await db.exercises.add({
      name, slug: '', category: newCat,
      primaryMuscles: [], secondaryMuscles: [], cues: [], instructions: [],
      image: '', video: '', inProgram: true,
    })
    onPick(id as number)
  }

  // Import a Library exercise into the program list (dedupe by slug), then add it.
  async function importLibrary(le: LibraryExercise) {
    const id = await ensureExerciseFromLibrary(le, { inProgram: true })
    onPick(id)
  }

  const tabBtn = (key: PickerTab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className="flex-1 rounded-[9px] py-1.5 text-xs font-semibold"
      style={{
        background: tab === key ? 'var(--accent)' : 'transparent',
        color: tab === key ? 'var(--on-accent)' : 'var(--dim)',
        border: '1px solid var(--line)',
      }}
    >
      {label}
    </button>
  )

  const renderRow = (e: Exercise, onClick: () => void) => (
    <div
      key={e.id}
      className="flex w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-sm"
      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ExerciseThumb src={e.image} alt={e.name} size="h-10 w-10" />
        <span className="min-w-0 flex-1 truncate">{e.name}</span>
        <span className="shrink-0 text-xs capitalize" style={{ color: 'var(--muted)' }}>{e.category}</span>
      </button>
      <LikeButton exerciseId={e.id!} size="sm" />
    </div>
  )

  return (
    <Modal title="Add exercise" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {tabBtn('liked', `Liked${likedRows.length ? ` · ${likedRows.length}` : ''}`)}
          {tabBtn('library', 'Library')}
          {tabBtn('mine', 'My exercises')}
        </div>

        <TextField value={query} onChange={setQuery} placeholder="Search exercises…" ariaLabel="Search exercises" />

        {tab === 'liked' && (
          <div className="max-h-[46dvh] space-y-1 overflow-y-auto">
            {liked.map((e) => renderRow(e, () => onPick(e.id!)))}
            {liked.length === 0 && (
              <p className="px-1 text-sm" style={{ color: 'var(--muted)' }}>
                No liked exercises yet — tap the heart on a library exercise to add it here.
              </p>
            )}
          </div>
        )}

        {tab === 'library' && (
          <>
            {libErr && <p className="text-sm" style={{ color: 'var(--muted)' }}>Couldn't load the library.</p>}
            {!lib && !libErr && <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading library…</p>}
            <div className="max-h-[46dvh] space-y-1 overflow-y-auto">
              {libMatches.map((e) => (
                <LibraryPickerRow key={e.id} le={e} exercises={exercises} onPick={() => void importLibrary(e)} />
              ))}
              {lib && libMatches.length === 0 && (
                <p className="px-1 text-sm" style={{ color: 'var(--muted)' }}>No matches.</p>
              )}
            </div>
          </>
        )}

        {tab === 'mine' && (
          <>
            <div className="max-h-[40dvh] space-y-1 overflow-y-auto">
              {mine.map((e) => renderRow(e, () => onPick(e.id!)))}
              {mine.length === 0 && (
                <p className="px-1 text-sm" style={{ color: 'var(--muted)' }}>No matches.</p>
              )}
            </div>

            <div className="rounded-card-sm border p-3" style={{ borderColor: 'var(--line)' }}>
              <Label>Create a new exercise</Label>
              <div className="flex gap-2">
                <TextField value={newName} onChange={setNewName} placeholder="Name" />
                <div className="w-32 shrink-0">
                  <SelectField value={newCat} onChange={setNewCat} options={CATEGORIES} ariaLabel="Category" />
                </div>
              </div>
              <button
                type="button"
                onClick={createNew}
                disabled={!newName.trim()}
                className="mt-2 w-full rounded-card-sm py-2 text-sm font-semibold disabled:opacity-40"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                Create &amp; add
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

/** Library row with a tap-to-add target AND a heart that creates/likes the row. */
function LibraryPickerRow({
  le,
  exercises,
  onPick,
}: {
  le: LibraryExercise
  exercises: Exercise[]
  onPick: () => void
}) {
  const existing = exercises.find((e) => e.slug && e.slug === le.id)
  return (
    <div
      className="flex w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-sm"
      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
    >
      <button type="button" onClick={onPick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ExerciseThumb src={le.images[0] ? LIB_IMG_BASE + le.images[0] : undefined} alt={le.name} size="h-10 w-10" />
        <span className="min-w-0 flex-1 truncate">{le.name}</span>
        <span className="shrink-0 text-xs capitalize" style={{ color: 'var(--muted)' }}>
          {le.primaryMuscles[0] ?? le.category}
        </span>
      </button>
      <LikeButton
        exerciseId={existing?.id ?? null}
        prepareId={async () => ensureExerciseFromLibrary(le)}
        size="sm"
      />
    </div>
  )
}
