import type { ExerciseCategory, LoggedSet, Session, SessionItem, TrainingGoal } from '../db/types'

const SEC_PER_REP = 3
const DEFAULT_SET_REST_SEC = 90
const WARMUP_COOLDOWN_MIN = 5

/** Epley estimated 1RM. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight
  return weight * (1 + reps / 30)
}

/** Best estimated 1RM across the logged sets that have weight + reps. */
export function bestE1RM(sets: LoggedSet[]): number | null {
  let best: number | null = null
  for (const s of sets) {
    if (s.weight != null && s.reps != null && s.reps > 0) {
      const e = epley1RM(s.weight, s.reps)
      if (best == null || e > best) best = e
    }
  }
  return best
}

/** Midpoint of a prescribed rep range, used as the rep estimate when reps aren't logged. */
export function estimatedReps(item: SessionItem): number | null {
  if (item.repLow == null) return null
  if (item.repHigh == null) return item.repLow
  return Math.round((item.repLow + item.repHigh) / 2)
}

/** Rough total session time (min): warm-up + cooldown + per-set work/rest. */
export function estimateSessionMinutes(session: Session): number {
  const workSec = session.items.reduce((sec, it) => {
    const reps = estimatedReps(it) ?? 10
    return sec + it.sets * (reps * SEC_PER_REP + DEFAULT_SET_REST_SEC)
  }, 0)
  const hasWarmup = session.warmup.length > 0 ? WARMUP_COOLDOWN_MIN : 0
  const hasCooldown = session.cooldown.length > 0 ? WARMUP_COOLDOWN_MIN : 0
  return Math.round(workSec / 60) + hasWarmup + hasCooldown
}

/** True when every prescribed set has been marked done. */
export function allSetsDone(item: SessionItem, sets: LoggedSet[]): boolean {
  if (item.sets <= 0) return false
  return sets.filter((s) => s.done).length >= item.sets
}

/** Suggested load jump by movement type (per the progressive-overload principle). */
export function nextWeightIncrement(category: ExerciseCategory): number {
  return category === 'lower' ? 5 : 2.5
}

// ── Training goals ────────────────────────────────────────────────────────────

export const GOAL_LABELS: Record<TrainingGoal, string> = {
  power: 'Power',
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  endurance: 'Endurance',
  skill: 'Skill',
}

/** Default rep range + RPE for a goal — applied when the user picks a goal. */
export function repsForGoal(goal: TrainingGoal): { repLow: number | null; repHigh: number | null; rpe: string } {
  switch (goal) {
    case 'power':
      return { repLow: 3, repHigh: 5, rpe: '7' }
    case 'strength':
      return { repLow: 4, repHigh: 6, rpe: '8' }
    case 'hypertrophy':
      return { repLow: 8, repHigh: 12, rpe: '8' }
    case 'endurance':
      return { repLow: 12, repHigh: 20, rpe: '9' }
    case 'skill':
      return { repLow: null, repHigh: null, rpe: 'hard' }
  }
}

/** Derive a goal label from a prescribed rep range (for items without an explicit goal). */
export function goalForReps(repLow: number | null, repHigh: number | null): TrainingGoal {
  if (repLow == null) return 'skill'
  const top = repHigh ?? repLow
  if (top <= 5) return 'power'
  if (top <= 6) return 'strength'
  if (top <= 12) return 'hypertrophy'
  return 'endurance'
}

export interface PlateResult {
  plates: { plate: number; count: number }[]
  perSide: number
  leftover: number
}

/** Greedy plate breakdown per side for a target total weight. */
export function plateBreakdown(
  target: number,
  bar: number,
  available = [25, 20, 15, 10, 5, 2.5, 1.25],
): PlateResult {
  const perSide = (target - bar) / 2
  const plates: { plate: number; count: number }[] = []
  let remaining = perSide
  if (remaining > 0) {
    for (const p of available) {
      const count = Math.floor(remaining / p + 1e-9)
      if (count > 0) {
        plates.push({ plate: p, count })
        remaining -= count * p
      }
    }
  }
  return { plates, perSide, leftover: Math.round(remaining * 100) / 100 }
}

export const round1 = (n: number): number => Math.round(n * 10) / 10
