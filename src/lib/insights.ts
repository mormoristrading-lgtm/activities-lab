import type { DailyLog, Exercise, WorkoutLog } from '../db/types'
import { parseLocalISO, todayISO, toISO } from './date'
import { bodyweightSeries, computePRs, volumeSeries } from './progress'
import { nextWeightIncrement, round1 } from './training'

export interface LiftInsight {
  name: string
  e1rm: number
  nextTarget: number
}

export interface WeeklyInsights {
  sessions: number
  volume: number // Σ weight×reps of done sets, this week (kg)
  volumeDeltaPct: number | null // vs last week
  bodyweight: number | null // latest 7-day avg this week
  bodyweightDelta: number | null // vs last week (kg)
  topLifts: LiftInsight[]
}

/** Compose the existing progress builders into a one-glance weekly summary. */
export function computeWeeklyInsights(input: {
  workouts: WorkoutLog[]
  daily: DailyLog[]
  exercises: Exercise[]
}): WeeklyInsights {
  const today = todayISO()
  const daysAgo = (n: number) => {
    const d = parseLocalISO(today)
    d.setDate(d.getDate() - n)
    return toISO(d)
  }
  const wkStart = daysAgo(6)
  const lastStart = daysAgo(13)
  const lastEnd = daysAgo(7)
  const inRange = (date: string, start: string, end: string) => date >= start && date <= end

  const sessions = input.workouts.filter(
    (w) => inRange(w.date, wkStart, today) && w.entries.some((e) => e.sets.some((s) => s.done)),
  ).length

  const vol = volumeSeries(input.workouts)
  const sumVol = (start: string, end: string) =>
    vol.filter((v) => inRange(v.date, start, end)).reduce((s, v) => s + v.volume, 0)
  const volume = sumVol(wkStart, today)
  const lastVolume = sumVol(lastStart, lastEnd)
  const volumeDeltaPct = lastVolume > 0 ? Math.round(((volume - lastVolume) / lastVolume) * 100) : null

  const bw = bodyweightSeries(input.daily)
  const bwThis = bw.filter((p) => inRange(p.date, wkStart, today)).at(-1)?.avg ?? null
  const bwLast = bw.filter((p) => inRange(p.date, lastStart, lastEnd)).at(-1)?.avg ?? null
  const bodyweightDelta = bwThis != null && bwLast != null ? round1(bwThis - bwLast) : null

  const prs = computePRs(input.workouts)
  const exById = new Map(input.exercises.map((e) => [e.id!, e]))
  const topLifts: LiftInsight[] = [...prs.values()]
    .sort((a, b) => b.bestE1RM - a.bestE1RM)
    .slice(0, 3)
    .map((pr) => {
      const ex = exById.get(pr.exerciseId)
      const inc = ex ? nextWeightIncrement(ex.category) : 2.5
      return {
        name: ex?.name ?? `#${pr.exerciseId}`,
        e1rm: round1(pr.bestE1RM),
        nextTarget: round1(pr.bestE1RM + inc),
      }
    })

  return { sessions, volume, volumeDeltaPct, bodyweight: bwThis, bodyweightDelta, topLifts }
}
