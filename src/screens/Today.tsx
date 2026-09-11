import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { DaySlot, Exercise, Run, Session } from '../db/types'
import { dayKey, dayOfYear, todayISO } from '../lib/date'
import { pickSessionSlot } from '../lib/calendar'
import Card from '../components/Card'
import ContourBackdrop from '../components/ContourBackdrop'
import Ring from '../components/Ring'
import Screen from '../components/Screen'

const SLOT_LABEL: Record<DaySlot['type'], string> = {
  gym: 'Gym',
  calisthenics: 'Calisthenics',
  crossfit: 'CrossFit',
  run: 'Run',
  mobility: 'Mobility',
  rest: 'Rest',
  other: 'Training',
}

/** Human description of a slot for the day-plan list. */
function slotDesc(slot: DaySlot, session: Session | null, run: Run | null): string {
  if (slot.type === 'gym' || slot.type === 'calisthenics' || slot.type === 'crossfit') {
    if (session && session.key === slot.sessionKey) return session.title
    return slot.text || slot.sessionKey || SLOT_LABEL[slot.type]
  }
  if (slot.type === 'run') return run?.label ?? slot.text ?? 'Run'
  return slot.text || SLOT_LABEL[slot.type]
}

export default function Today({ onStartSession }: { onStartSession: () => void }) {
  const data = useLiveQuery(async () => {
    const day = dayKey()
    const plan = await db.weekPlan.get(day)

    const exMap: Record<number, Exercise> = {}
    let session = null
    // The hero session is the day's structured session — AM preferred, else PM;
    // gym or calisthenics/crossfit (anything carrying a sessionKey).
    const sessionKey = pickSessionSlot(plan ?? undefined)?.sessionKey ?? null
    if (sessionKey) {
      // sessions/runs aren't indexed by `key` (tiny tables) — scan in JS.
      const all = await db.sessions.toArray()
      session = all.find((s) => s.key === sessionKey) ?? null
      if (session) {
        const exs = await db.exercises.bulkGet(session.items.map((i) => i.exerciseId))
        for (const e of exs) if (e?.id != null) exMap[e.id] = e
      }
    }

    const runs = await db.runs.toArray()

    let log = null
    if (session) {
      const logs = await db.workoutLogs.where('date').equals(todayISO()).toArray()
      log = logs.find((l) => l.sessionKey === session!.key) ?? null
    }

    const motivation = await db.motivation.filter((m) => m.enabled).toArray()
    return { plan, session, exMap, runs, log, motivation }
  }, [])

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (!data) {
    return (
      <Screen eyebrow="Activities Lab" title="Today">
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </Screen>
    )
  }

  const { plan, session, exMap, runs, log, motivation } = data
  const runOf = (slot: DaySlot) =>
    slot.type === 'run' && slot.runType ? (runs.find((r) => r.key === slot.runType) ?? null) : null

  // completion ring
  const totalSets = session ? session.items.reduce((n, i) => n + i.sets, 0) : 0
  const doneSets = log
    ? log.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
    : 0
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0

  const line = motivation.length ? motivation[dayOfYear() % motivation.length].text : ''

  return (
    <Screen eyebrow="Activities Lab" title="Today">
      {/* Hero: today's session */}
      <Card className="relative overflow-hidden">
        <ContourBackdrop className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="relative p-5">
          <p className="text-sm" style={{ color: 'var(--dim)' }}>
            {dateLabel}
          </p>

          {session ? (
            <>
              <div className="mt-4 flex items-center gap-5">
                <Ring percent={pct}>
                  <span className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                    {pct}%
                  </span>
                </Ring>
                <div className="min-w-0">
                  <h2 className="text-xl">{session.title}</h2>
                  <p className="text-sm" style={{ color: 'var(--dim)' }}>
                    {session.items.length} exercises · {totalSets} working sets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onStartSession}
                className="mt-5 w-full rounded-card-sm py-3 text-sm font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {pct > 0 ? 'Continue session' : 'Start session'}
              </button>
            </>
          ) : (
            <div className="mt-3">
              <h2 className="text-xl">
                {plan?.isRest
                  ? 'Rest day'
                  : plan?.am?.[0]
                    ? slotDesc(plan.am[0], null, runOf(plan.am[0]))
                    : 'No session today'}
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--dim)' }}>
                {plan?.isRest
                  ? 'Recovery is training. Keep the standards.'
                  : plan?.am?.[0]
                    ? `${SLOT_LABEL[plan.am[0].type]}${plan.am[0].minutes ? ` · ~${plan.am[0].minutes} min` : ''}`
                    : 'Open Program to plan your week.'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Motivation */}
      {line && (
        <p className="mt-5 px-1 text-center text-sm italic" style={{ color: 'var(--dim)' }}>
          “{line}”
        </p>
      )}

      {/* Session overview */}
      {session && (
        <Card className="mt-4 p-4">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
            Session overview
          </p>
          <ul className="mt-2 space-y-1">
            {session.items.map((it, idx) => {
              const e = exMap[it.exerciseId]
              const reps = it.repLow != null ? `${it.repLow}–${it.repHigh}` : it.rpe
              return (
                <li key={idx} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text)' }}>{e?.name ?? 'Exercise'}</span>
                  <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
                    {it.sets} × {reps}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </Screen>
  )
}
