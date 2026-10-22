import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { WorkoutEntry, WorkoutLog } from '../../db/types'
import { dayKey, todayISO } from '../../lib/date'
import { pickSessionSlot } from '../../lib/calendar'
import { buzz } from '../../lib/haptics'
import { estimatedReps, nextWeightIncrement, round1 } from '../../lib/training'
import Card from '../../components/Card'
import ExerciseThumb from '../../components/ExerciseThumb'
import { NumberField, SelectField } from '../../components/Field'

/** Heaviest weight logged for an exercise in a prior session (null if none). */
function prevWeightFor(prev: WorkoutLog | null | undefined, exerciseId: number): number | null {
  const e = prev?.entries.find((x) => x.exerciseId === exerciseId)
  if (!e) return null
  const ws = e.sets.filter((s) => s.weight != null).map((s) => s.weight as number)
  return ws.length ? Math.max(...ws) : null
}

/** Log today's session: adjust a weight if it changed, then tap Complete. Nothing else. */
export default function SessionLogger() {
  const meta = useLiveQuery(async () => {
    const sessions = await db.sessions.orderBy('order').toArray()
    const plan = await db.weekPlan.get(dayKey())
    const exercises = await db.exercises.toArray()
    const todayKey = pickSessionSlot(plan)?.sessionKey ?? null
    return { sessions, todayKey, exercises }
  }, [])

  const [selKey, setSelKey] = useState<string | null>(null)
  useEffect(() => {
    if (meta && selKey == null) setSelKey(meta.todayKey ?? meta.sessions[0]?.key ?? null)
  }, [meta, selKey])

  const today = todayISO()
  const session = meta?.sessions.find((s) => s.key === selKey) ?? null
  const exById = useMemo(() => new Map((meta?.exercises ?? []).map((e) => [e.id!, e] as const)), [meta])

  // most recent log for this session before today → pre-fills weights
  const previous = useLiveQuery(async () => {
    if (!selKey) return null
    const all = await db.workoutLogs.where('sessionKey').equals(selKey).toArray()
    return all.filter((l) => l.date < today).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  }, [selKey, today])

  const [entries, setEntries] = useState<WorkoutEntry[] | null>(null)
  const entriesRef = useRef<WorkoutEntry[] | null>(null)
  entriesRef.current = entries

  useEffect(() => {
    let alive = true
    void (async () => {
      if (!selKey || !session) return
      const todayLog = (await db.workoutLogs.where('date').equals(today).toArray()).find((l) => l.sessionKey === selKey)
      if (todayLog) {
        if (alive) setEntries(todayLog.entries)
        return
      }
      if (previous === undefined) return // wait for history so weights can pre-fill
      const fresh: WorkoutEntry[] = session.items.map((it) => {
        const w = exById.get(it.exerciseId)?.targetWeight ?? prevWeightFor(previous, it.exerciseId) ?? null
        return {
          exerciseId: it.exerciseId,
          sets: Array.from({ length: it.sets }, () => ({ weight: w, reps: null, rpe: it.rpe, done: false })),
        }
      })
      if (alive) setEntries(fresh)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, session?.id, previous, today])

  async function save(next: WorkoutEntry[]) {
    if (!selKey) return
    await db.transaction('rw', db.workoutLogs, async () => {
      const existing = (await db.workoutLogs.where('date').equals(today).toArray()).find((l) => l.sessionKey === selKey)
      if (existing) await db.workoutLogs.update(existing.id!, { entries: next })
      else await db.workoutLogs.add({ date: today, sessionKey: selKey, entries: next, notes: '' })
    })
  }

  function setWeight(ei: number, w: number | null) {
    const cur = entriesRef.current
    if (!cur) return
    const next = cur.map((e, i) => (i === ei ? { ...e, sets: e.sets.map((s) => ({ ...s, weight: w })) } : e))
    setEntries(next)
    void save(next)
  }

  // Marks every set done, filling reps with the rep-range midpoint so volume/PRs still compute.
  function setComplete(done: boolean) {
    const cur = entriesRef.current
    if (!cur || !session) return
    buzz(done ? 40 : 10)
    const next = cur.map((e, i) => ({
      ...e,
      sets: e.sets.map((s) => ({ ...s, done, reps: done ? (s.reps ?? estimatedReps(session.items[i])) : s.reps })),
    }))
    setEntries(next)
    void save(next)
  }

  if (!meta || !session || !entries) return <p style={{ color: 'var(--muted)' }}>Loading…</p>

  const isComplete = entries.length > 0 && entries.every((e) => e.sets.length > 0 && e.sets.every((s) => s.done))

  return (
    <div className="space-y-3">
      <SelectField
        ariaLabel="Session to log"
        value={selKey ?? ''}
        onChange={(v) => {
          setEntries(null) // so no edit writes the old session's sets into the new one
          setSelKey(v)
        }}
        options={meta.sessions.map((s) => ({ value: s.key, label: s.title }))}
      />

      {session.items.map((item, ei) => {
        const ex = exById.get(item.exerciseId)
        const weight = entries[ei]?.sets[0]?.weight ?? null
        const prev = prevWeightFor(previous, item.exerciseId) ?? 0
        const inc = ex ? nextWeightIncrement(ex.category) : 2.5
        const reps = item.repLow != null ? `${item.repLow}–${item.repHigh}` : item.repHigh != null ? `${item.repHigh}` : '—'

        return (
          <Card key={ei} className="p-3">
            <div className="flex items-center gap-3">
              <ExerciseThumb src={ex?.image} alt={ex?.name ?? ''} size="h-11 w-11" rounded="rounded-card-sm" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                  {ex?.name ?? `Exercise #${item.exerciseId}`}
                </h3>
                <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                  {item.sets} × {reps}
                  {prev > 0 && ` · last ${prev} kg · try ${round1(prev + inc)}`}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                aria-label={`Decrease ${ex?.name ?? 'exercise'} weight by ${inc} kg`}
                onClick={() => setWeight(ei, Math.max(0, round1((weight ?? prev) - inc)))}
                className="grid h-11 w-12 shrink-0 place-items-center rounded-card-sm border text-xl leading-none"
                style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
              >
                −
              </button>
              <div className="flex-1">
                <NumberField value={weight} step={inc} onChange={(v) => setWeight(ei, v)} ariaLabel={`${ex?.name ?? 'Exercise'} weight (kg)`} />
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                kg
              </span>
              <button
                type="button"
                aria-label={`Increase ${ex?.name ?? 'exercise'} weight by ${inc} kg`}
                onClick={() => setWeight(ei, round1((weight ?? prev) + inc))}
                className="grid h-11 w-12 shrink-0 place-items-center rounded-card-sm text-xl leading-none"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                +
              </button>
            </div>
          </Card>
        )
      })}

      {/* Sticky so it's reachable from anywhere in the list */}
      <div
        className="sticky z-10 -mx-4 px-4 pt-6 pb-2"
        style={{
          bottom: 'calc(var(--safe-bottom) + 3.75rem)',
          background: 'linear-gradient(to top, var(--bg) 65%, transparent)',
        }}
      >
        <button
          type="button"
          onClick={() => setComplete(!isComplete)}
          className="w-full rounded-[14px] py-4 text-base font-semibold shadow-md"
          style={{ background: isComplete ? 'var(--good)' : 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {isComplete ? 'Session complete ✓  ·  tap to undo' : 'Complete session'}
        </button>
      </div>
    </div>
  )
}
