import type { Exercise, Session, StrengthEntry, WeekPlanDay, WorkoutLog } from '../db/types'
import { epley1RM } from './training'

// ── Canonical muscle regions (the body-map paint targets) ────────────────────
export type Region =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'lats'
  | 'traps'
  | 'upperBack'
  | 'lowerBack'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'hipFlexors'

export const REGIONS: Region[] = [
  'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'lats', 'traps',
  'upperBack', 'lowerBack', 'glutes', 'quads', 'hamstrings', 'calves', 'hipFlexors',
]

export const REGION_LABEL: Record<Region, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  lats: 'Lats',
  traps: 'Traps',
  upperBack: 'Upper back',
  lowerBack: 'Lower back',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  hipFlexors: 'Hip flexors',
}

// Maps the raw muscle strings used across exercises (free-exercise-db + our seed)
// onto canonical regions. Anything unmapped is ignored in the map.
const REGION_OF: Record<string, Region> = {
  chest: 'chest', pectorals: 'chest',
  shoulders: 'shoulders', deltoids: 'shoulders', 'front delts': 'shoulders', 'rear delts': 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  abdominals: 'abs', abs: 'abs', obliques: 'abs', serratus: 'abs', 'serratus anterior': 'abs',
  lats: 'lats', latissimus: 'lats',
  traps: 'traps', trapezius: 'traps', neck: 'traps',
  'middle back': 'upperBack', 'upper back': 'upperBack', rhomboids: 'upperBack',
  'lower back': 'lowerBack', 'erector spinae': 'lowerBack', 'spinal erectors': 'lowerBack',
  glutes: 'glutes', 'gluteus maximus': 'glutes', abductors: 'glutes',
  quadriceps: 'quads', quads: 'quads', adductors: 'quads',
  hamstrings: 'hamstrings',
  calves: 'calves',
  'hip flexors': 'hipFlexors',
}

export function normalizeMuscle(name: string): Region | null {
  return REGION_OF[name.trim().toLowerCase()] ?? null
}

const round1 = (n: number): number => Math.round(n * 10) / 10
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

// ── Volume ───────────────────────────────────────────────────────────────────
export interface MuscleVolume {
  region: Region
  primarySets: number
  secondarySets: number
  /** primary + ½·secondary, the headline weekly figure */
  effectiveSets: number
  /** 0–10 coverage score (≈10–20 effective sets = optimal) */
  score: number
}

/** 0–10 weekly-volume score. ~20 effective sets caps at 10 (well-developed stimulus). */
export function volumeScore(effectiveSets: number): number {
  return clamp(Math.round(effectiveSets / 2), 0, 10)
}

function volumeFrom(contribs: { ex: Exercise; sets: number }[]): MuscleVolume[] {
  const prim: Partial<Record<Region, number>> = {}
  const sec: Partial<Record<Region, number>> = {}
  for (const { ex, sets } of contribs) {
    for (const m of ex.primaryMuscles ?? []) {
      const r = normalizeMuscle(m)
      if (r) prim[r] = (prim[r] ?? 0) + sets
    }
    for (const m of ex.secondaryMuscles ?? []) {
      const r = normalizeMuscle(m)
      if (r) sec[r] = (sec[r] ?? 0) + sets
    }
  }
  const regions = new Set<Region>([...(Object.keys(prim) as Region[]), ...(Object.keys(sec) as Region[])])
  return [...regions]
    .map((region) => {
      const primarySets = prim[region] ?? 0
      const secondarySets = sec[region] ?? 0
      const effectiveSets = round1(primarySets + 0.5 * secondarySets)
      return { region, primarySets, secondarySets, effectiveSets, score: volumeScore(effectiveSets) }
    })
    .sort((a, b) => b.effectiveSets - a.effectiveSets)
}

/** Weekly volume per muscle from the PLANNED program (sessions referenced in the week plan). */
export function weeklyMuscleVolume(
  weekPlan: WeekPlanDay[],
  sessions: Session[],
  exercises: Exercise[],
): MuscleVolume[] {
  const exById = new Map(exercises.map((e) => [e.id!, e]))
  const sByKey = new Map(sessions.map((s) => [s.key, s]))
  const contribs: { ex: Exercise; sets: number }[] = []
  for (const day of weekPlan) {
    for (const slot of [...day.am, ...day.pm]) {
      if (!slot.sessionKey) continue
      const sess = sByKey.get(slot.sessionKey)
      if (!sess) continue
      for (const it of sess.items) {
        const ex = exById.get(it.exerciseId)
        if (ex) contribs.push({ ex, sets: it.sets })
      }
    }
  }
  return volumeFrom(contribs)
}

/** Volume per muscle from COMPLETED workouts (done sets) on/after `sinceISO`. */
export function loggedMuscleVolume(
  workouts: WorkoutLog[],
  exercises: Exercise[],
  sinceISO: string,
): MuscleVolume[] {
  const exById = new Map(exercises.map((e) => [e.id!, e]))
  const contribs: { ex: Exercise; sets: number }[] = []
  for (const w of workouts) {
    if (w.date < sinceISO) continue
    for (const e of w.entries) {
      const done = e.sets.filter((s) => s.done).length
      if (!done) continue
      const ex = exById.get(e.exerciseId)
      if (ex) contribs.push({ ex, sets: done })
    }
  }
  return volumeFrom(contribs)
}

export function volumeByRegion(vols: MuscleVolume[]): Partial<Record<Region, MuscleVolume>> {
  const m: Partial<Record<Region, MuscleVolume>> = {}
  for (const v of vols) m[v.region] = v
  return m
}

// ── Balance ratios ───────────────────────────────────────────────────────────
export interface BalanceRatios {
  pushPull: number
  quadHam: number
  antPost: number
}

const sumEff = (map: Partial<Record<Region, MuscleVolume>>, regions: Region[]): number =>
  regions.reduce((n, r) => n + (map[r]?.effectiveSets ?? 0), 0)

export function balanceRatios(vols: MuscleVolume[]): BalanceRatios {
  const m = volumeByRegion(vols)
  const ratio = (a: number, b: number) => (b > 0 ? round1(a / b) : a > 0 ? Infinity : 0)
  const push = sumEff(m, ['chest', 'shoulders', 'triceps'])
  const pull = sumEff(m, ['lats', 'upperBack', 'biceps'])
  const ant = sumEff(m, ['chest', 'shoulders', 'biceps', 'abs', 'quads', 'forearms', 'hipFlexors'])
  const post = sumEff(m, ['lats', 'upperBack', 'lowerBack', 'traps', 'triceps', 'glutes', 'hamstrings'])
  return {
    pushPull: ratio(push, pull),
    quadHam: ratio(m.quads?.effectiveSets ?? 0, m.hamstrings?.effectiveSets ?? 0),
    antPost: ratio(ant, post),
  }
}

/** Overall program coverage — mean score across all trained regions, 0–10. */
export function coverageScore(vols: MuscleVolume[]): number {
  if (!vols.length) return 0
  return round1(vols.reduce((n, v) => n + v.score, 0) / vols.length)
}

// ── Strength ─────────────────────────────────────────────────────────────────
type StrengthClass =
  | 'squat' | 'deadlift' | 'benchPress' | 'overheadPress'
  | 'pullup' | 'row' | 'curl' | 'calf'

export interface Benchmark {
  exerciseId: number
  label: string
  cls: StrengthClass
  addBodyweight?: boolean
}

/** Curated benchmark lifts (reference program exercise ids) covering the major regions. */
export const BENCHMARKS: Benchmark[] = [
  { exerciseId: 1, label: 'Back Squat', cls: 'squat' },
  { exerciseId: 7, label: 'Bench Press', cls: 'benchPress' },
  { exerciseId: 34, label: 'Sumo Deadlift', cls: 'deadlift' },
  { exerciseId: 30, label: 'Seated DB Shoulder Press', cls: 'overheadPress' },
  { exerciseId: 20, label: 'Weighted Pull-up', cls: 'pullup', addBodyweight: true },
  { exerciseId: 21, label: 'Barbell Row', cls: 'row' },
  { exerciseId: 37, label: 'EZ-Bar Curl', cls: 'curl' },
  { exerciseId: 5, label: 'Standing Calf Raise', cls: 'calf' },
]

// e1RM-to-bodyweight ratio → 0–10 level breakpoints (rough adult-male standards).
// For pull-up the ratio is (added load + bodyweight) / bodyweight.
const STANDARDS: Record<StrengthClass, [number, number][]> = {
  squat: [[0.75, 2], [1.0, 4], [1.5, 6], [2.0, 8], [2.5, 10]],
  deadlift: [[1.0, 2], [1.5, 5], [2.0, 7], [2.5, 9], [3.0, 10]],
  benchPress: [[0.5, 2], [0.75, 4], [1.0, 6], [1.5, 8], [2.0, 10]],
  overheadPress: [[0.35, 2], [0.5, 4], [0.7, 6], [0.9, 8], [1.1, 10]],
  pullup: [[1.0, 4], [1.25, 6], [1.5, 8], [1.75, 9], [2.0, 10]],
  row: [[0.5, 2], [0.75, 4], [1.0, 6], [1.25, 8], [1.5, 10]],
  curl: [[0.25, 2], [0.4, 4], [0.5, 6], [0.65, 8], [0.8, 10]],
  calf: [[1.0, 3], [1.5, 5], [2.0, 7], [2.5, 9], [3.0, 10]],
}

function levelForRatio(cls: StrengthClass, ratio: number): number {
  const bps = STANDARDS[cls]
  if (ratio <= bps[0][0]) return clamp((bps[0][1] * ratio) / bps[0][0], 0, 10)
  for (let i = 1; i < bps.length; i++) {
    if (ratio <= bps[i][0]) {
      const [r0, l0] = bps[i - 1]
      const [r1, l1] = bps[i]
      return clamp(l0 + ((l1 - l0) * (ratio - r0)) / (r1 - r0), 0, 10)
    }
  }
  return 10
}

export interface MuscleStrength {
  region: Region
  score: number
  /** ≥2 below the user's own mean → flagged as lagging */
  lagging: boolean
}

export interface StrengthResult {
  muscles: MuscleStrength[]
  byRegion: Partial<Record<Region, number>>
  strongest: Region | null
  weakest: Region | null
  /** 'absolute' uses bodyweight standards; 'relative' normalizes within your own lifts */
  mode: 'absolute' | 'relative'
  /** number of valid benchmark entries used */
  used: number
}

/**
 * Strength score (0–10) per muscle from the user's benchmark report.
 * With a bodyweight, scores are ABSOLUTE (vs bodyweight-relative standards);
 * without one, they're RELATIVE (e1RM normalized to the strongest lift) and
 * only the imbalance ranking is meaningful.
 */
export function computeStrength(
  report: StrengthEntry[],
  exercises: Exercise[],
  bodyweightKg: number | null,
): StrengthResult {
  const exById = new Map(exercises.map((e) => [e.id!, e]))
  const benchById = new Map(BENCHMARKS.map((b) => [b.exerciseId, b]))
  const hasBw = bodyweightKg != null && bodyweightKg > 0
  const accum: Partial<Record<Region, { sum: number; w: number }>> = {}
  const push = (r: Region, value: number, weight: number) => {
    const a = accum[r] ?? { sum: 0, w: 0 }
    a.sum += value * weight
    a.w += weight
    accum[r] = a
  }

  let used = 0
  for (const entry of report) {
    const ex = exById.get(entry.exerciseId)
    if (!ex || !entry.kg || !entry.reps) continue
    const bench = benchById.get(entry.exerciseId)
    const addBw = (entry.addBodyweight ?? bench?.addBodyweight) && hasBw
    const load = entry.kg + (addBw ? bodyweightKg! : 0)
    const e1rm = epley1RM(load, entry.reps)
    if (e1rm <= 0) continue
    used++
    const value = hasBw && bench ? levelForRatio(bench.cls, e1rm / bodyweightKg!) : e1rm
    for (const m of ex.primaryMuscles ?? []) {
      const r = normalizeMuscle(m)
      if (r) push(r, value, 1)
    }
    for (const m of ex.secondaryMuscles ?? []) {
      const r = normalizeMuscle(m)
      if (r) push(r, value, 0.5)
    }
  }

  const byRegion: Partial<Record<Region, number>> = {}
  for (const r of Object.keys(accum) as Region[]) {
    const a = accum[r]!
    byRegion[r] = a.w > 0 ? a.sum / a.w : 0
  }

  const mode: 'absolute' | 'relative' = hasBw ? 'absolute' : 'relative'
  if (mode === 'relative') {
    const max = Math.max(1, ...(Object.values(byRegion).filter((v): v is number => v != null)))
    for (const r of Object.keys(byRegion) as Region[]) byRegion[r] = (byRegion[r]! / max) * 10
  }

  const scores = Object.values(byRegion).filter((v): v is number => v != null)
  const mean = scores.length ? scores.reduce((n, v) => n + v, 0) / scores.length : 0
  const muscles: MuscleStrength[] = (Object.keys(byRegion) as Region[])
    .map((region) => ({ region, score: round1(byRegion[region]!), lagging: byRegion[region]! <= mean - 2 }))
    .sort((a, b) => b.score - a.score)

  return {
    muscles,
    byRegion,
    strongest: muscles[0]?.region ?? null,
    weakest: muscles.length ? muscles[muscles.length - 1].region : null,
    mode,
    used,
  }
}
