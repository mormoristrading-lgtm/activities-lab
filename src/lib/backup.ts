import { exportDB, importInto } from 'dexie-export-import'
import { db } from '../db/db'
import { todayISO } from './date'

const BACKUP_KEY = 'lastBackupAt'

async function stamp(): Promise<void> {
  await db.settings.put({ key: BACKUP_KEY, value: todayISO() })
}

/** ISO date of the last successful backup/share, or null. */
export async function getLastBackupAt(): Promise<string | null> {
  const s = await db.settings.get(BACKUP_KEY)
  return (s?.value as string) ?? null
}

/** Export every table to a single JSON file and trigger a download. */
export async function exportBackup(): Promise<void> {
  const blob = await exportDB(db, { prettyJson: true })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `activities-lab-backup-${todayISO()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  await stamp()
}

/** Share the backup via the OS share sheet (mobile — save to Files/iCloud/email);
 *  falls back to a plain download where the Web Share API isn't available. */
export async function shareBackup(): Promise<void> {
  const blob = await exportDB(db, { prettyJson: true })
  const file = new File([blob], `activities-lab-backup-${todayISO()}.json`, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Activities Lab backup' })
      await stamp()
    } catch (e) {
      // user dismissed the share sheet — not an error, nothing saved
      if ((e as DOMException)?.name !== 'AbortError') await exportBackup()
    }
    return
  }
  await exportBackup() // no Web Share → download
}

/** Restore from a backup file: clears existing tables, then loads the file. */
export async function importBackup(file: File): Promise<void> {
  await importInto(db, file, {
    clearTablesBeforeImport: true,
    acceptVersionDiff: true,
  })
}
