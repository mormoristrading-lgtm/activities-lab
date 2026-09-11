// ── Domain types for every Dexie table ───────────────────────────────────────
// CONTENT tables are seeded once and edited via the UI. LOG tables are written
// as the app is used. Shapes follow the build brief.

export type ExerciseCategory =
  | 'lower'
  | 'upperPush'
  | 'upperPull'
  | 'skill'
  | 'accessory'
  | 'mobility'

/** Training intent for a prescribed exercise — drives the default rep range. */
export type TrainingGoal = 'power' | 'strength' | 'hypertrophy' | 'endurance' | 'skill'

export interface Exercise {
  id?: number
  /** stable slug used to join enrichment images + library records */
  slug?: string
  name: string
  category: ExerciseCategory
  primaryMuscles: string[]
  secondaryMuscles: string[]
  cues: string[]
  instructions: string[]
  /** local (bundled) or remote image URL; '' when none */
  image: string
  video: string
  /** true for movements that belong to the user's program */
  inProgram: boolean
  /** planned working weight (kg); pre-fills the logger. null/undefined = use last log */
  targetWeight?: number | null
  /** planned working reps that pair with targetWeight */
  targetReps?: number | null
  /** favourited by the user (Liked tab) */
  liked?: boolean
}

/** A prescribed exercise inside a session. */
export interface SessionItem {
  exerciseId: number
  /** number of working sets */
  sets: number
  /** rep range; null for hold/skill work */
  repLow: number | null
  repHigh: number | null
  /** RPE target, free text e.g. "7–8", "8", "hard" */
  rpe: string
  /** training intent; optional for back-compat (derived from rep range when absent) */
  goal?: TrainingGoal
  note: string
}

export interface Session {
  id?: number
  key: string
  title: string
  order: number
  warmup: string[]
  /** post-session stretch routine, tailored to the muscles this session trains */
  cooldown: string[]
  items: SessionItem[]
}

export type RunType = 'easy' | 'tempo' | 'interval' | 'long'
export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

/** Discipline of one timed block in the day program. */
export type SlotType = 'gym' | 'calisthenics' | 'crossfit' | 'run' | 'mobility' | 'rest' | 'other'

/** One block of a day (morning or afternoon) with an estimated duration. */
export interface DaySlot {
  type: SlotType
  /** Session.key for gym/calisthenics/crossfit blocks */
  sessionKey?: string | null
  /** Run.key when type === 'run' */
  runType?: RunType | null
  /** free description — metcon detail, mobility focus, walk, etc. */
  text?: string
  /** estimated duration in minutes */
  minutes?: number
}

export interface WeekPlanDay {
  day: DayKey
  /** morning activities, in order (empty = nothing scheduled) */
  am: DaySlot[]
  /** afternoon activities, in order */
  pm: DaySlot[]
  isRest: boolean
}

export interface Run {
  id?: number
  key: RunType
  label: string
  paceNote: string
  detail: string
}

export interface Metcon {
  id?: number
  name: string
  format: string
  detail: string
}

/** Single-row table (id: 'targets'). */
export interface Nutrition {
  id: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  water_l: number
  creatine_g: number
  exampleDay: string[]
  supplements: string[]
}

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Shake' | 'Snack'

export interface MealPreset {
  id?: number
  name: string
  slot: MealSlot
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface Guidance {
  id?: number
  title: string
  body: string // markdown
  order: number
}

export interface Goal {
  id?: number
  label: string
  current: string
  target: string
  unit: string
  accent: 'clay' | 'sage'
}

export interface StandardDef {
  id?: number
  label: string
  order: number
}

export type ReminderType =
  | 'creatine'
  | 'water'
  | 'weighIn'
  | 'session'
  | 'sleep'
  | 'mobility'
  | 'weeklyReview'

export interface Reminder {
  id?: number
  type: ReminderType
  time: string // 'HH:MM'
  enabled: boolean
  message: string
}

export interface Motivation {
  id?: number
  text: string
  enabled: boolean
}

// ── LOG tables ────────────────────────────────────────────────────────────────

export interface LoggedSet {
  weight: number | null
  reps: number | null
  rpe: string
  done: boolean
}

export interface WorkoutEntry {
  exerciseId: number
  sets: LoggedSet[]
}

export interface WorkoutLog {
  id?: number
  date: string // YYYY-MM-DD
  sessionKey: string
  entries: WorkoutEntry[]
  notes: string
}

export interface RunLog {
  id?: number
  date: string
  type: RunType | string
  distance_km: number
  duration_min: number
  notes: string
  source: 'manual' | 'strava'
  stravaId?: number
}

export interface LoggedMeal {
  id: string
  name: string
  slot?: MealSlot
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DailyLog {
  date: string
  bodyweight_kg?: number
  sleep_h?: number
  energy?: number
  water_l?: number
  creatine?: boolean
  protein_g?: number
  calories?: number
  // Phase 3 — Fuel
  carbs_g?: number
  fat_g?: number
  meals?: LoggedMeal[]
  supplementsDone?: Record<string, boolean>
}

export interface Measurement {
  date: string
  waist?: number
  arm_l?: number
  arm_r?: number
  thigh_l?: number
  thigh_r?: number
  chest?: number
}

export interface StandardsLog {
  date: string
  done: Record<string, boolean>
}

export interface Media {
  id?: number
  exerciseId: number
  date?: string
  blob: Blob
}

export interface Setting {
  key: string
  value: unknown
}

/** One benchmark lift in the Strength Report (settings key 'strengthReport'). */
export interface StrengthEntry {
  exerciseId: number
  kg: number
  reps: number
  /** add bodyweight to the load (pull-up/dip) when computing e1RM */
  addBodyweight?: boolean
}

export interface JournalEntry {
  id?: number
  date: string
  type: 'note' | 'review'
  text: string
  energy?: number // 1–5, for weekly reviews
}

// ── Library (static, bundled free-exercise-db reference) ─────────────────────
export interface LibraryExercise {
  id: string
  name: string
  category: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  images: string[]
}
