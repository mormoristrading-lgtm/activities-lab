import { db } from '../db/db'
import type { RunType } from '../db/types'

interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type?: string
  distance: number // meters
  moving_time: number // seconds
  start_date_local: string // ISO 8601 local
}

function inferType(distanceKm: number): RunType {
  return distanceKm >= 12 ? 'long' : 'easy'
}

export interface SyncResult {
  added: number
  skipped: number
}

/**
 * Fetch activities from the user's Strava proxy Worker and map runs into runLogs.
 * Dedupes on stravaId so re-syncing never creates duplicates.
 */
export async function syncStrava(workerUrl: string): Promise<SyncResult> {
  const base = workerUrl.trim().replace(/\/+$/, '')
  const res = await fetch(`${base}?per_page=50`)
  if (!res.ok) throw new Error(`Worker returned ${res.status}`)

  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response — check the Worker URL and its setup.')
  }
  const activities = data as StravaActivity[]

  const existing = await db.runLogs.toArray()
  const seen = new Set(existing.map((r) => r.stravaId).filter((x): x is number => x != null))

  let added = 0
  let skipped = 0
  for (const a of activities) {
    const isRun = a.type === 'Run' || (a.sport_type ?? '').includes('Run')
    if (!isRun) continue
    if (seen.has(a.id)) {
      skipped++
      continue
    }
    const km = a.distance / 1000
    await db.runLogs.add({
      date: a.start_date_local.slice(0, 10),
      type: inferType(km),
      distance_km: Math.round(km * 100) / 100,
      duration_min: Math.round(a.moving_time / 60),
      notes: a.name,
      source: 'strava',
      stravaId: a.id,
    })
    seen.add(a.id)
    added++
  }
  return { added, skipped }
}
