import { db } from '../db/db'
import type { DailyLog, LoggedMeal } from '../db/types'
import { todayISO } from './date'
import { mealTotals } from './nutrition'

/** Transaction-safe read-modify-write of today's dailyLog row. */
export async function updateDaily(fn: (cur: DailyLog) => Partial<DailyLog>) {
  const today = todayISO()
  await db.transaction('rw', db.dailyLog, async () => {
    const cur = (await db.dailyLog.get(today)) ?? { date: today }
    await db.dailyLog.put({ ...cur, ...fn(cur) })
  })
}

/** Append a meal to today's log and recompute macro totals. */
export function addMeal(meal: Omit<LoggedMeal, 'id'>) {
  return updateDaily((cur) => {
    const meals = [...(cur.meals ?? []), { ...meal, id: crypto.randomUUID() }]
    return { meals, ...mealTotals(meals) }
  })
}

/** Remove a meal by id and recompute macro totals. */
export function removeMeal(id: string) {
  return updateDaily((cur) => {
    const meals = (cur.meals ?? []).filter((m) => m.id !== id)
    return { meals, ...mealTotals(meals) }
  })
}
