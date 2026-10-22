import type { ExerciseCategory, SessionItem, TrainingGoal } from '../db/types'

/** Epley estimated 1RM. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight
  return weight * (1 + reps / 30)
}

/** Midpoint of a prescribed rep range, used as the rep estimate when reps aren't logged. */
export function estimatedReps(item: SessionItem): number | null {
  if (item.repLow == null) return item.repHigh
  if (item.repHigh == null) return item.repLow
  return Math.round((item.repLow + item.repHigh) / 2)
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

export const round1 = (n: number): number => Math.round(n * 10) / 10
