import type { Exercise, ExerciseCategory, LibraryExercise } from '../db/types'
import { db } from '../db/db'

export const LIB_IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

/** Coarse mapping from a free-exercise-db category to the app's ExerciseCategory. */
export function libCategory(le: LibraryExercise): ExerciseCategory {
  if (le.category === 'stretching' || le.equipment === 'foam roll') return 'mobility'
  return 'accessory'
}

/**
 * Ensure a library exercise has a matching row in db.exercises (dedupe by slug).
 * Returns the row's id. Used by the program-picker and by the Like flow so the
 * heart on a Library card can target a stable Exercise id.
 */
export async function ensureExerciseFromLibrary(
  le: LibraryExercise,
  opts: { inProgram?: boolean; liked?: boolean } = {},
): Promise<number> {
  const existing = await db.exercises.where('slug').equals(le.id).first()
  if (existing?.id != null) {
    // patch only when caller actually flips a flag (avoid useless writes)
    const patch: Partial<Exercise> = {}
    if (opts.inProgram === true && !existing.inProgram) patch.inProgram = true
    if (opts.liked === true && !existing.liked) patch.liked = true
    if (Object.keys(patch).length) await db.exercises.update(existing.id, patch)
    return existing.id
  }
  const id = await db.exercises.add({
    name: le.name,
    slug: le.id,
    category: libCategory(le),
    primaryMuscles: le.primaryMuscles,
    secondaryMuscles: le.secondaryMuscles,
    cues: [],
    instructions: le.instructions,
    image: le.images?.[0] ? LIB_IMG_BASE + le.images[0] : '',
    video: '',
    inProgram: opts.inProgram === true,
    liked: opts.liked === true ? true : undefined,
  })
  return id as number
}

/** Flip the `liked` flag on an exercise id. */
export async function toggleLiked(exerciseId: number): Promise<boolean> {
  const cur = await db.exercises.get(exerciseId)
  const next = !cur?.liked
  await db.exercises.update(exerciseId, { liked: next || undefined })
  return next
}

// ── Disciplines ───────────────────────────────────────────────────────────────
// The bundled dataset (free-exercise-db) has no native calisthenics/crossfit/
// running tags, so we derive a discipline from its `category` + `equipment`.
// Curated running drills are pre-tagged with category 'running' (see
// src/data/running-drills.ts) so they short-circuit the classifier.

export type Discipline = 'gym' | 'calisthenics' | 'crossfit' | 'stretch' | 'running' | 'core'

export const DISCIPLINES: { key: Discipline; label: string }[] = [
  { key: 'gym', label: 'Gym' },
  { key: 'calisthenics', label: 'Calisthenics' },
  { key: 'crossfit', label: 'CrossFit' },
  { key: 'stretch', label: 'Stretch & mobility' },
  { key: 'running', label: 'Running' },
  { key: 'core', label: 'Core' },
]

const CROSSFIT_CATEGORIES = new Set(['olympic weightlifting', 'strongman', 'plyometrics'])
const CROSSFIT_EQUIPMENT = new Set(['kettlebells', 'medicine ball'])

/** Map a dataset exercise to a single discipline. Precedence matters. */
export function disciplineOf(ex: LibraryExercise): Discipline {
  if (ex.category === 'running') return 'running'
  if (ex.category === 'stretching' || ex.equipment === 'foam roll') return 'stretch'
  if (ex.primaryMuscles.includes('abdominals')) return 'core'
  if (ex.equipment === 'body only') return 'calisthenics'
  if (CROSSFIT_CATEGORIES.has(ex.category) || (ex.equipment && CROSSFIT_EQUIPMENT.has(ex.equipment)))
    return 'crossfit'
  return 'gym'
}

// ── Muscle groups (Gym sub-grouping) ──────────────────────────────────────────
// Core lives in its own discipline, so it is intentionally absent here.
export const MUSCLE_GROUPS: { key: string; label: string; muscles: string[] }[] = [
  { key: 'chest', label: 'Chest', muscles: ['chest'] },
  { key: 'back', label: 'Back', muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  { key: 'shoulders', label: 'Shoulders', muscles: ['shoulders'] },
  { key: 'legs', label: 'Legs', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'] },
  { key: 'arms', label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
]

/** Stretch-discipline exercises whose primary muscles intersect the given group. */
export function stretchesForMuscles(all: LibraryExercise[], muscles: string[]): LibraryExercise[] {
  return all.filter(
    (e) => disciplineOf(e) === 'stretch' && e.primaryMuscles.some((m) => muscles.includes(m)),
  )
}
