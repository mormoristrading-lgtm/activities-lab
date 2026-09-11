import type {
  DailyLog,
  DaySlot,
  RunLog,
  Session,
  StandardDef,
  StandardsLog,
  WeekPlanDay,
  WorkoutLog,
} from '../db/types'
import { dayKey, parseLocalISO, toISO } from './date'

// ── Per-day rollup of everything logged/planned for one date ─────────────────
export interface DaySummary {
  date: string
  /** the weekday's plan is marked a rest day */
  isRest: boolean
  /** scheduled gym Session.key for that weekday (am preferred, else pm), or null */
  scheduledKey: string | null
  scheduledTitle: string | null
  /** completion of the SCHEDULED session (0–100), or null if none scheduled */
  sessionPct: number | null
  /** any workout was logged with ≥1 done set (scheduled or not) */
  trained: boolean
  /** titles of sessions actually logged that day */
  loggedTitles: string[]
  /** tonnage (Σ weight×reps of done sets) that day */
  volume: number
  runKm: number
  runCount: number
  standardsDone: number
  standardsTotal: number
  weighedIn: boolean
  bodyweight: number | null
}

export interface DayIndexInput {
  workouts: WorkoutLog[]
  runs: RunLog[]
  standardsLog: StandardsLog[]
  daily: DailyLog[]
  weekPlan: WeekPlanDay[]
  sessions: Session[]
  standardsDef: StandardDef[]
}

/** Looks up a full DaySummary for any ISO date (derives plan even for empty days). */
export type DayLookup = (date: string) => DaySummary

/**
 * The structured-session block for a planned day — morning preferred, else
 * afternoon. Matches any slot carrying a `sessionKey` (gym, calisthenics or
 * crossfit), so a PM lift or a calisthenics day surfaces just like an AM gym.
 */
export function pickSessionSlot(plan?: WeekPlanDay): DaySlot | null {
  if (!plan) return null
  const hasSession = (s: DaySlot) =>
    !!s.sessionKey && (s.type === 'gym' || s.type === 'calisthenics' || s.type === 'crossfit')
  return plan.am.find(hasSession) ?? plan.pm.find(hasSession) ?? null
}

function groupByDate<T extends { date: string }>(arr: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const item of arr) {
    const list = m.get(item.date)
    if (list) list.push(item)
    else m.set(item.date, [item])
  }
  return m
}

/**
 * Build a lookup over all logs + the recurring week plan. Logging is unchanged —
 * this only READS. `sessionPct` mirrors the Today/SessionLogger notion of
 * completion (done sets vs prescribed sets for the scheduled session).
 */
export function buildDayIndex(input: DayIndexInput): DayLookup {
  const planByDay = new Map(input.weekPlan.map((p) => [p.day, p]))
  const sessionByKey = new Map(input.sessions.map((s) => [s.key, s]))
  const standardsTotal = input.standardsDef.length

  const workoutsByDate = groupByDate(input.workouts)
  const runsByDate = groupByDate(input.runs)
  const standardsByDate = new Map(input.standardsLog.map((l) => [l.date, l]))
  const dailyByDate = new Map(input.daily.map((d) => [d.date, d]))

  return (date) => {
    const plan = planByDay.get(dayKey(parseLocalISO(date)))
    const sessionSlot = pickSessionSlot(plan)
    const scheduledKey = sessionSlot?.sessionKey ?? null
    const scheduledSession = scheduledKey ? (sessionByKey.get(scheduledKey) ?? null) : null

    const dayWorkouts = workoutsByDate.get(date) ?? []
    let volume = 0
    let trained = false
    const loggedTitles: string[] = []
    for (const w of dayWorkouts) {
      let anyDone = false
      for (const e of w.entries) {
        for (const s of e.sets) {
          if (s.done) {
            anyDone = true
            if (s.weight != null && s.reps != null) volume += s.weight * s.reps
          }
        }
      }
      if (anyDone) {
        trained = true
        loggedTitles.push(sessionByKey.get(w.sessionKey)?.title ?? w.sessionKey)
      }
    }

    let sessionPct: number | null = null
    if (scheduledSession) {
      const totalSets = scheduledSession.items.reduce((n, i) => n + i.sets, 0)
      const log = dayWorkouts.find((w) => w.sessionKey === scheduledKey)
      const doneSets = log
        ? log.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
        : 0
      sessionPct = totalSets ? Math.round((doneSets / totalSets) * 100) : null
    }

    const dayRuns = runsByDate.get(date) ?? []
    const runKm = Math.round(dayRuns.reduce((s, r) => s + (r.distance_km || 0), 0) * 10) / 10

    const stLog = standardsByDate.get(date)
    const standardsDone = stLog
      ? input.standardsDef.filter((d) => d.id != null && stLog.done[d.id]).length
      : 0

    const dl = dailyByDate.get(date)

    return {
      date,
      isRest: plan?.isRest ?? false,
      scheduledKey,
      scheduledTitle: scheduledSession?.title ?? null,
      sessionPct,
      trained,
      loggedTitles,
      volume: Math.round(volume),
      runKm,
      runCount: dayRuns.length,
      standardsDone,
      standardsTotal,
      weighedIn: dl?.bodyweight_kg != null,
      bodyweight: dl?.bodyweight_kg ?? null,
    }
  }
}

// ── Calendar status (drives a cell's training tint) ──────────────────────────
export type DayStatus = 'complete' | 'partial' | 'planned' | 'rest' | 'empty'

export function dayStatus(s: DaySummary): DayStatus {
  if (s.sessionPct === 100 || (s.trained && s.scheduledKey == null)) return 'complete'
  if ((s.sessionPct ?? 0) > 0 || s.trained) return 'partial'
  if (s.scheduledKey) return 'planned'
  if (s.isRest) return 'rest'
  return 'empty'
}

// ── Date grid helpers ────────────────────────────────────────────────────────
export interface MonthCell {
  iso: string
  day: number
  inMonth: boolean
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Mon-first weeks covering `month` (0-based), with leading/trailing spill days. */
export function monthMatrix(year: number, month: number): MonthCell[][] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // 0 = Monday
  let cur = addDays(first, -lead)
  const weeks: MonthCell[][] = []
  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = []
    for (let d = 0; d < 7; d++) {
      week.push({ iso: toISO(cur), day: cur.getDate(), inMonth: cur.getMonth() === month })
      cur = addDays(cur, 1)
    }
    weeks.push(week)
  }
  // Drop a trailing week that belongs entirely to the next month.
  while (weeks.length > 4 && weeks[weeks.length - 1].every((c) => !c.inMonth)) weeks.pop()
  return weeks
}

/** `weeks` columns (Mon-first) ending on the week containing `endISO`. */
export function heatmapColumns(endISO: string, weeks: number): string[][] {
  const end = parseLocalISO(endISO)
  const endDow = (end.getDay() + 6) % 7
  const lastMonday = addDays(end, -endDow)
  let cur = addDays(lastMonday, -(weeks - 1) * 7)
  const cols: string[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: string[] = []
    for (let d = 0; d < 7; d++) {
      col.push(toISO(cur))
      cur = addDays(cur, 1)
    }
    cols.push(col)
  }
  return cols
}

/** GitHub-style 0–4 intensity bucket for a value relative to the window max. */
export function bucketOf(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)))
}
