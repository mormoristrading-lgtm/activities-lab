import type { StandardsLog } from '../db/types'
import { parseLocalISO, todayISO, toISO } from './date'

export interface StreakInfo {
  streak: number
  doneToday: boolean
}

/**
 * Per-standard streak = consecutive days the standard was marked done, ending
 * today (or yesterday if not yet done today — the streak stays alive until
 * end of day).
 */
export function computeStreaks(
  standardIds: number[],
  logs: StandardsLog[],
  today = todayISO(),
): Map<number, StreakInfo> {
  const byDate = new Map(logs.map((l) => [l.date, l.done]))
  const result = new Map<number, StreakInfo>()

  for (const id of standardIds) {
    const doneToday = !!byDate.get(today)?.[id]
    const cursor = parseLocalISO(today)
    if (!doneToday) cursor.setDate(cursor.getDate() - 1)
    let streak = 0
    while (byDate.get(toISO(cursor))?.[id]) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    result.set(id, { streak, doneToday })
  }
  return result
}
