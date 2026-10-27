import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  Exercise,
  Session,
  WeekPlanDay,
  Run,
  Nutrition,
  MealPreset,
  Guidance,
  Goal,
  StandardDef,
  Reminder,
  Motivation,
  WorkoutLog,
  RunLog,
  DailyLog,
  Measurement,
  StandardsLog,
  Media,
  Setting,
  JournalEntry,
} from './types'
import { seedDatabase, EXERCISES, SESSIONS, WEEK_PLAN, RUNS, GUIDANCE } from './seed'

// Auto-increment (++id) tables use EntityTable so `add()` doesn't require the id.
// String-PK tables (weekPlan/nutrition/dailyLog/…) use Table<T, KeyType>.
export const db = new Dexie('ActivitiesLab') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  sessions: EntityTable<Session, 'id'>
  weekPlan: Table<WeekPlanDay, string>
  runs: EntityTable<Run, 'id'>
  nutrition: Table<Nutrition, string>
  mealPresets: EntityTable<MealPreset, 'id'>
  guidance: EntityTable<Guidance, 'id'>
  goals: EntityTable<Goal, 'id'>
  standardsDef: EntityTable<StandardDef, 'id'>
  reminders: EntityTable<Reminder, 'id'>
  motivation: EntityTable<Motivation, 'id'>
  workoutLogs: EntityTable<WorkoutLog, 'id'>
  runLogs: EntityTable<RunLog, 'id'>
  dailyLog: Table<DailyLog, string>
  measurements: Table<Measurement, string>
  standardsLog: Table<StandardsLog, string>
  media: EntityTable<Media, 'id'>
  settings: Table<Setting, string>
  journal: EntityTable<JournalEntry, 'id'>
}

db.version(1).stores({
  exercises: '++id, name, category',
  sessions: '++id, order',
  weekPlan: 'day',
  runs: '++id',
  metcons: '++id',
  nutrition: 'id',
  mealPresets: '++id',
  guidance: '++id, order',
  goals: '++id',
  standardsDef: '++id, order',
  reminders: '++id',
  motivation: '++id',
  workoutLogs: '++id, date, sessionKey',
  runLogs: '++id, date',
  dailyLog: 'date',
  measurements: 'date',
  standardsLog: 'date',
  media: '++id, exerciseId',
  settings: 'key',
})

// v2 — Phase 5 adds the journal (free notes + saved weekly reviews).
db.version(2).stores({
  journal: '++id, date',
})

// v3 — the week plan moves from loose AM/PM text to structured timed slots
// (DaySlot). Re-seed the template week so existing installs get the new shape;
// only the weekPlan template is replaced — logs/sessions/exercises are untouched.
db.version(3).stores({}).upgrade(async (tx) => {
  await tx.table('weekPlan').clear()
  await tx.table('weekPlan').bulkAdd(WEEK_PLAN)
})

// v4 — each AM/PM session can hold MULTIPLE activities, so am/pm become arrays.
// Normalize any single-slot (or null) rows from v3 into arrays. Idempotent.
db.version(4).stores({}).upgrade(async (tx) => {
  const norm = (s: unknown) => (Array.isArray(s) ? s : s ? [s] : [])
  const rows = await tx.table('weekPlan').toArray()
  for (const r of rows) {
    await tx.table('weekPlan').put({ ...r, am: norm(r.am), pm: norm(r.pm) })
  }
})

// v5 — add `slug` and `liked` indexes to exercises so the picker can dedupe
// library imports by slug, and the Library can query favourites. Existing rows
// keep their existing values; no row migration needed.
db.version(5).stores({
  exercises: '++id, name, category, slug, liked',
})

// v6 — the 7-day hybrid program rebuild. Replace program CONTENT
// (exercises/sessions/weekPlan/runs) for existing installs; all LOG tables are
// left untouched. Exercise ids 1–24 are re-created with the same ids so prior
// lift history stays linked; ids 25–38 add the new movements.
db.version(6).stores({}).upgrade(async (tx) => {
  await tx.table('exercises').clear()
  await tx.table('exercises').bulkAdd(EXERCISES)
  await tx.table('sessions').clear()
  await tx.table('sessions').bulkAdd(SESSIONS)
  await tx.table('weekPlan').clear()
  await tx.table('weekPlan').bulkAdd(WEEK_PLAN)
  await tx.table('runs').clear()
  await tx.table('runs').bulkAdd(RUNS)
})

// v7 — replace hybrid 7-day program with 5-day hypertrophy split
// (Upper · Lower · Push · Pull · Legs). Content tables replaced;
// all log tables (workoutLogs, runLogs, dailyLog, etc.) are preserved.
db.version(7).stores({}).upgrade(async (tx) => {
  await tx.table('exercises').clear()
  await tx.table('exercises').bulkAdd(EXERCISES)
  await tx.table('sessions').clear()
  await tx.table('sessions').bulkAdd(SESSIONS)
  await tx.table('weekPlan').clear()
  await tx.table('weekPlan').bulkAdd(WEEK_PLAN)
  await tx.table('runs').clear()
  await tx.table('runs').bulkAdd(RUNS)
})

// v8 — swap 3 accessory movements (Skullcrusher → Overhead Cable Triceps
// Extension, Single-Arm DB Row → Single-Arm Chest-Supported Row, Hip Thrust →
// 45° Back Extension) and give every session its own tailored warm-up +
// post-session stretch (new `cooldown` field). Content tables replaced; all
// log tables (workoutLogs, runLogs, dailyLog, etc.) are preserved.
db.version(8).stores({}).upgrade(async (tx) => {
  await tx.table('exercises').clear()
  await tx.table('exercises').bulkAdd(EXERCISES)
  await tx.table('sessions').clear()
  await tx.table('sessions').bulkAdd(SESSIONS)
})

// v9 — warm-ups and cooldowns are bodyweight-only now (no bands, machines, or
// cardio equipment). Content tables replaced; log tables preserved.
db.version(9).stores({}).upgrade(async (tx) => {
  await tx.table('sessions').clear()
  await tx.table('sessions').bulkAdd(SESSIONS)
})

// v10 — adds the Today-screen "Weight goal" card: a single target-bodyweight
// setting it reads/writes. Existing installs get the default target (70 kg);
// fresh installs get it from the seed.
db.version(10).stores({}).upgrade(async (tx) => {
  const existing = await tx.table('settings').get('weightGoalKg')
  if (!existing) await tx.table('settings').add({ key: 'weightGoalKg', value: 70 })
})

// v11 — drops the `metcons` table: it was seeded content with no screen ever
// reading it. Dead data, removed for simplicity; nothing else changes.
db.version(11).stores({ metcons: null })

// v12 — program revision: Legs moves to Day 3 and Upper #2 to Day 4, sets
// capped at 4, fuller leg/back/biceps/core/delt coverage, new exercises
// (ids 1001+). Exercises are UPSERTED rather than cleared, so library imports,
// likes and target weights survive; sessions, week plan and guidance are
// replaced. Log tables are untouched.
db.version(12).stores({}).upgrade(async (tx) => {
  const exercises = tx.table('exercises')
  for (const e of EXERCISES) {
    const cur = await exercises.get(e.id)
    await exercises.put({
      ...e,
      liked: cur?.liked,
      targetWeight: cur?.targetWeight,
      targetReps: cur?.targetReps,
    })
  }
  await tx.table('sessions').clear()
  await tx.table('sessions').bulkAdd(SESSIONS)
  await tx.table('weekPlan').clear()
  await tx.table('weekPlan').bulkAdd(WEEK_PLAN)
  await tx.table('guidance').clear()
  await tx.table('guidance').bulkAdd(GUIDANCE)
})

// Seed exactly once, atomically, when the DB is first created.
db.on('populate', () => seedDatabase(db))

export type AppDB = typeof db
