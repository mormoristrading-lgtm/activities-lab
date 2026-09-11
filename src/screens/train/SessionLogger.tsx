import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { WorkoutEntry } from '../../db/types'
import { dayKey, todayISO } from '../../lib/date'
import { pickSessionSlot } from '../../lib/calendar'
import {
  allSetsDone,
  bestE1RM,
  estimatedReps,
  estimateSessionMinutes,
  GOAL_LABELS,
  goalForReps,
  nextWeightIncrement,
  plateBreakdown,
  round1,
} from '../../lib/training'
import type { WorkoutLog } from '../../db/types'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import ExerciseThumb from '../../components/ExerciseThumb'
import LikeButton from '../../components/LikeButton'
import { NumberField, SelectField } from '../../components/Field'

/** mm:ss for the live session stopwatch. */
function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Heaviest weight logged for an exercise in a prior session (null if none). */
function prevWeightFor(prev: WorkoutLog | null | undefined, exerciseId: number): number | null {
  const e = prev?.entries.find((x) => x.exerciseId === exerciseId)
  if (!e) return null
  const ws = e.sets.filter((s) => s.weight != null).map((s) => s.weight as number)
  return ws.length ? Math.max(...ws) : null
}

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

  // Which day we're logging for — defaults to today, but can be set back to
  // backfill a workout you forgot to log.
  const [logDate, setLogDate] = useState(todayISO())

  const session = meta?.sessions.find((s) => s.key === selKey) ?? null
  const exById = useMemo(
    () => new Map((meta?.exercises ?? []).map((e) => [e.id!, e] as const)),
    [meta],
  )

  // most recent log for this session BEFORE the logging date → "previous" reference
  const previous = useLiveQuery(async () => {
    if (!selKey) return null
    const all = await db.workoutLogs.where('sessionKey').equals(selKey).toArray()
    return all.filter((l) => l.date < logDate).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  }, [selKey, logDate])

  const [entries, setEntries] = useState<WorkoutEntry[] | null>(null)
  const [notes, setNotes] = useState('')
  const entriesRef = useRef<WorkoutEntry[] | null>(null)
  entriesRef.current = entries

  const [plateOpen, setPlateOpen] = useState(false)
  const [started, setStarted] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  // live stopwatch — ticks once a second while the session is started
  useEffect(() => {
    if (!started) return
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [started])

  // reset the stopwatch when switching session or backfill date
  useEffect(() => {
    setStarted(false)
    setElapsedSec(0)
  }, [selKey, logDate])

  // load the chosen day's draft (or build a fresh one) when session/date changes
  useEffect(() => {
    let alive = true
    void (async () => {
      if (!selKey || !session) return
      const logs = await db.workoutLogs.where('date').equals(logDate).toArray()
      const todayLog = logs.find((l) => l.sessionKey === selKey)
      if (todayLog) {
        if (alive) {
          setEntries(todayLog.entries)
          setNotes(todayLog.notes ?? '')
        }
        return
      }
      // Building fresh — wait for the previous log so we can pre-fill weights.
      if (previous === undefined) return
      const fresh: WorkoutEntry[] = session.items.map((it) => {
        // Option C: explicit target wins, else the last logged weight.
        const w = exById.get(it.exerciseId)?.targetWeight ?? prevWeightFor(previous, it.exerciseId) ?? null
        return {
          exerciseId: it.exerciseId,
          sets: Array.from({ length: it.sets }, () => ({
            weight: w,
            reps: null,
            rpe: it.rpe,
            done: false,
          })),
        }
      })
      if (alive) {
        setEntries(fresh)
        setNotes('')
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, session?.id, previous, logDate])

  async function upsert(next: WorkoutEntry[], notesVal: string) {
    if (!selKey) return
    await db.transaction('rw', db.workoutLogs, async () => {
      const logs = await db.workoutLogs.where('date').equals(logDate).toArray()
      const existing = logs.find((l) => l.sessionKey === selKey)
      if (existing) await db.workoutLogs.update(existing.id!, { entries: next, notes: notesVal })
      else await db.workoutLogs.add({ date: logDate, sessionKey: selKey, entries: next, notes: notesVal })
    })
  }

  // One working weight applies to every set in the exercise.
  function setWeight(ei: number, w: number | null) {
    const cur = entriesRef.current
    if (!cur) return
    const next = cur.map((e, i) =>
      i === ei ? { ...e, sets: e.sets.map((s) => ({ ...s, weight: w })) } : e,
    )
    setEntries(next)
    void upsert(next, notes)
  }

  // Mark every set in every exercise done at once, filling reps with the
  // rep-range estimate so volume / e1RM still compute downstream.
  function completeSession() {
    const cur = entriesRef.current
    if (!cur || !session) return
    const next = cur.map((e, i) => ({
      ...e,
      sets: e.sets.map((s) => ({ ...s, done: true, reps: estimatedReps(session.items[i]) })),
    }))
    setEntries(next)
    void upsert(next, notes)
    setStarted(false)
  }

  function uncompleteSession() {
    const cur = entriesRef.current
    if (!cur) return
    const next = cur.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: false })) }))
    setEntries(next)
    void upsert(next, notes)
  }

  function saveNotes(v: string) {
    setNotes(v)
    if (entriesRef.current) void upsert(entriesRef.current, v)
  }

  if (!meta || !session || !entries) return <p style={{ color: 'var(--muted)' }}>Loading…</p>

  const totalSets = session.items.reduce((n, i) => n + i.sets, 0)
  const doneSets = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const isComplete = totalSets > 0 && doneSets === totalSets

  return (
    <div className="space-y-4">
      {/* Header: session switcher + progress + plate calc */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SelectField
            ariaLabel="Session to log"
            value={selKey ?? ''}
            onChange={(v) => {
              // Clear entries synchronously so no edit can write the old
              // session's sets into the newly-selected one before the load
              // effect repopulates (shows "Loading…" for the brief gap).
              setEntries(null)
              setSelKey(v)
            }}
            options={meta.sessions.map((s) => ({ value: s.key, label: s.title }))}
          />
        </div>
        <button
          type="button"
          onClick={() => setPlateOpen(true)}
          className="shrink-0 rounded-[10px] border px-3 py-2 text-xs font-medium"
          style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
        >
          Plates
        </button>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--dim)' }}>{logDate === todayISO() ? 'Today' : 'Logging'}</span>
          <input
            type="date"
            value={logDate}
            max={todayISO()}
            onChange={(e) => {
              setEntries(null) // clear so no edit writes into the wrong day before reload
              setLogDate(e.target.value || todayISO())
            }}
            aria-label="Log date"
            className="rounded-[8px] border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>
        {started ? (
          <span className="font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
            ⏱ {formatElapsed(elapsedSec)}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
              ~{estimateSessionMinutes(session)} min
            </span>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="rounded-[10px] px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              Start session
            </button>
          </div>
        )}
      </div>

      {session.warmup.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
            Warm-up
          </p>
          <ul className="mt-1 text-sm" style={{ color: 'var(--text)' }}>
            {session.warmup.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Exercises */}
      {session.items.map((item, ei) => {
        const ex = exById.get(item.exerciseId)
        const entry = entries[ei]
        const prevEntry = previous?.entries.find((e) => e.exerciseId === item.exerciseId) ?? null
        const e1rm = entry ? bestE1RM(entry.sets) : null
        const suggest = ex && entry && allSetsDone(item, entry.sets)
        const inc = ex ? nextWeightIncrement(ex.category) : 2.5
        const reps = item.repLow != null ? `${item.repLow}–${item.repHigh}` : '—'
        const goal = item.goal ?? goalForReps(item.repLow, item.repHigh)
        const weight = entry?.sets[0]?.weight ?? null
        const prevWeight = prevEntry
          ? Math.max(0, ...prevEntry.sets.filter((s) => s.weight != null).map((s) => s.weight!))
          : 0

        return (
          <Card key={ei} className="p-4">
            <div className="flex items-start gap-3">
              <ExerciseThumb src={ex?.image} alt={ex?.name ?? ''} size="h-14 w-14" rounded="rounded-card-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                    {ex?.name ?? `Exercise #${item.exerciseId}`}
                  </h3>
                  <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                    {item.sets} × {reps} @ {item.rpe}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: 'var(--surface-2)', color: 'var(--accent-2)' }}
                  >
                    {GOAL_LABELS[goal]}
                  </span>
                  {item.note && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {item.note}
                    </span>
                  )}
                </div>
              </div>
              <LikeButton exerciseId={item.exerciseId} size="sm" />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="w-28">
                <NumberField
                  value={weight}
                  onChange={(v) => setWeight(ei, v)}
                  ariaLabel={`${ex?.name ?? 'Exercise'} weight (kg)`}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                kg
              </span>
            </div>

            {/* previous reference + e1RM + progression suggestion */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {prevWeight > 0 && (
                <span style={{ color: 'var(--muted)' }}>prev: {prevWeight} kg</span>
              )}
              {ex?.targetWeight != null && (
                <span style={{ color: 'var(--accent-2)' }}>target {ex.targetWeight} kg</span>
              )}
              {e1rm != null && (
                <span style={{ color: 'var(--dim)' }}>e1RM ~{round1(e1rm)} kg (est)</span>
              )}
              {suggest && ex && (() => {
                const base = weight ?? (prevWeight > 0 ? prevWeight : null)
                if (base == null) return null
                const next = round1(base + inc)
                return (
                  <button
                    type="button"
                    onClick={() => void db.exercises.update(ex.id!, { targetWeight: next })}
                    className="font-semibold underline underline-offset-2"
                    style={{ color: 'var(--good)' }}
                  >
                    ✓ All sets done — tap to set target {next} kg
                  </button>
                )
              })()}
            </div>
          </Card>
        )
      })}

      {session.cooldown.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
            Post-session stretch
          </p>
          <ul className="mt-1 text-sm" style={{ color: 'var(--text)' }}>
            {session.cooldown.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-4">
        <p className="mb-1 text-xs font-medium" style={{ color: 'var(--dim)' }}>
          Session notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => saveNotes(e.target.value)}
          rows={2}
          placeholder="How did it feel?"
          className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
        />
      </Card>

      <button
        type="button"
        onClick={() => (isComplete ? uncompleteSession() : completeSession())}
        className="w-full rounded-[12px] py-3 text-sm font-semibold"
        style={{
          background: isComplete ? 'var(--good)' : 'var(--accent)',
          color: 'var(--on-accent)',
        }}
      >
        {isComplete ? 'Session complete ✓ — tap to undo' : 'Complete session'}
      </button>

      <p className="pb-1 text-center text-xs" style={{ color: 'var(--muted)' }}>
        Saved automatically{started || elapsedSec > 0 ? ` · ${formatElapsed(elapsedSec)} elapsed` : ''}
      </p>

      {plateOpen && <PlateModal onClose={() => setPlateOpen(false)} />}
    </div>
  )
}

// ── Plate calculator ─────────────────────────────────────────────────────────
function PlateModal({ onClose }: { onClose: () => void }) {
  const [target, setTarget] = useState<number | null>(100)
  const [bar, setBar] = useState(20)
  const res = plateBreakdown(target ?? 0, bar)

  return (
    <Modal title="Plate calculator" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-medium" style={{ color: 'var(--dim)' }}>
              Target total (kg)
            </p>
            <NumberField value={target} step={2.5} onChange={setTarget} ariaLabel="Target weight" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium" style={{ color: 'var(--dim)' }}>
              Bar (kg)
            </p>
            <SelectField
              ariaLabel="Bar weight"
              value={String(bar)}
              onChange={(v) => setBar(Number(v))}
              options={[
                { value: '20', label: '20 (Olympic)' },
                { value: '15', label: '15' },
                { value: '10', label: '10' },
                { value: '7.5', label: '7.5' },
              ]}
            />
          </div>
        </div>

        <div className="rounded-card-sm border p-4" style={{ borderColor: 'var(--line)' }}>
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
            Per side
          </p>
          {res.perSide <= 0 ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Target is at or below the bar weight.
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-2">
                {res.plates.map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full px-3 py-1 text-sm font-semibold tabular-nums"
                    style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  >
                    {p.count} × {p.plate}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                {round1(res.perSide)} kg per side
                {res.leftover > 0 ? ` · ${res.leftover} kg can't be made with standard plates` : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
