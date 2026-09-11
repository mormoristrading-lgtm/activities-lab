import type { DailyLog, RunLog, WorkoutLog } from '../db/types'
import { epley1RM } from './training'
import { parseLocalISO, toISO } from './date'

const DAY = 86_400_000

export interface BWPoint {
  date: string
  weight: number
  avg: number
}

/** Bodyweight points with a trailing 7-calendar-day average. */
export function bodyweightSeries(daily: DailyLog[]): BWPoint[] {
  const points = daily
    .filter((d) => typeof d.bodyweight_kg === 'number')
    .map((d) => ({ date: d.date, weight: d.bodyweight_kg as number }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return points.map((p) => {
    const t = parseLocalISO(p.date).getTime()
    const window = points.filter((q) => {
      const qt = parseLocalISO(q.date).getTime()
      return qt <= t && qt > t - 7 * DAY
    })
    const avg = window.reduce((s, q) => s + q.weight, 0) / window.length
    return { date: p.date, weight: p.weight, avg: Math.round(avg * 10) / 10 }
  })
}

export interface VolumePoint {
  date: string
  volume: number
}

/** Total tonnage (Σ weight×reps of done sets) per workout date. */
export function volumeSeries(workouts: WorkoutLog[]): VolumePoint[] {
  const byDate = new Map<string, number>()
  for (const w of workouts) {
    let vol = 0
    for (const e of w.entries) {
      for (const s of e.sets) {
        if (s.done && s.weight != null && s.reps != null) vol += s.weight * s.reps
      }
    }
    byDate.set(w.date, (byDate.get(w.date) ?? 0) + vol)
  }
  return [...byDate.entries()]
    .map(([date, volume]) => ({ date, volume: Math.round(volume) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface MileagePoint {
  week: string // ISO date of that week's Monday
  km: number
}

/** Weekly running mileage, keyed by the Monday of each week. */
export function mileageSeries(runs: RunLog[]): MileagePoint[] {
  const byWeek = new Map<string, number>()
  for (const r of runs) {
    const d = parseLocalISO(r.date)
    const dow = (d.getDay() + 6) % 7 // 0 = Monday
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow)
    const key = toISO(monday)
    byWeek.set(key, (byWeek.get(key) ?? 0) + (r.distance_km || 0))
  }
  return [...byWeek.entries()]
    .map(([week, km]) => ({ week, km: Math.round(km * 10) / 10 }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

export interface PR {
  exerciseId: number
  bestE1RM: number
  bestWeight: number
  bestReps: number
  date: string
}

/** Best estimated 1RM (and heaviest set) per exercise across all workout logs. */
export function computePRs(workouts: WorkoutLog[]): Map<number, PR> {
  const prs = new Map<number, PR>()
  for (const w of workouts) {
    for (const e of w.entries) {
      for (const s of e.sets) {
        // Only completed sets count toward a PR (matches volumeSeries).
        if (!s.done || s.weight == null || s.reps == null || s.reps <= 0) continue
        const e1 = epley1RM(s.weight, s.reps)
        const cur = prs.get(e.exerciseId)
        if (!cur || e1 > cur.bestE1RM) {
          prs.set(e.exerciseId, {
            exerciseId: e.exerciseId,
            bestE1RM: Math.round(e1 * 10) / 10,
            bestWeight: s.weight,
            bestReps: s.reps,
            date: w.date,
          })
        }
      }
    }
  }
  return prs
}

/** Days since the most recent measurement (null if none). */
export function daysSinceLastMeasurement(dates: string[]): number | null {
  if (dates.length === 0) return null
  const latest = dates.slice().sort().at(-1)!
  return Math.floor((Date.now() - new Date(latest).getTime()) / DAY)
}

/** Short label like "15 Jun" for chart axes. */
export function shortDate(isoDate: string): string {
  return parseLocalISO(isoDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
