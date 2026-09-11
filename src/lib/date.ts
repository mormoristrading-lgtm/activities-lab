import type { DayKey } from '../db/types'

const DOW: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Local-time YYYY-MM-DD (not UTC — avoids off-by-one near midnight). */
export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayISO = (): string => toISO(new Date())

/** Parse a 'YYYY-MM-DD' string as a LOCAL date (not UTC midnight). */
export function parseLocalISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function dayKey(d: Date = new Date()): DayKey {
  return DOW[d.getDay()]
}

export function dayOfYear(d: Date = new Date()): number {
  // UTC-normalized date parts → immune to DST hour shifts.
  const ms = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)
  return Math.floor(ms / 86_400_000)
}

export const DAY_ORDER: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
