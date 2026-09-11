import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { uploadConfig } from '../../lib/push'
import Card from '../../components/Card'
import { IconButton } from '../../components/Field'

export default function MotivationEditor() {
  const data = useLiveQuery(async () => {
    const lines = await db.motivation.toArray()
    const pushWorkerUrl = ((await db.settings.get('pushWorkerUrl'))?.value as string) ?? ''
    return { lines, pushWorkerUrl }
  }, [])

  if (!data) return null

  // Motivation lines feed both the Today rotation and the daily push — re-sync on edit.
  const reupload = () => {
    if (data.pushWorkerUrl.trim()) void uploadConfig(data.pushWorkerUrl).catch(() => {})
  }

  const add = () => void db.motivation.add({ text: '', enabled: true })
  const update = (id: number, patch: { text?: string; enabled?: boolean }) =>
    void db.motivation.update(id, patch).then(reupload)
  const remove = (id: number) => void db.motivation.delete(id).then(reupload)

  return (
    <Card className="p-4">
      <h2 className="mb-2 text-base font-semibold">Motivation lines</h2>
      <ul className="space-y-2">
        {data.lines.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={(e) => update(m.id!, { enabled: e.target.checked })}
              aria-label="Line enabled"
              className="h-5 w-5 shrink-0 accent-[var(--accent)]"
            />
            <input
              type="text"
              defaultValue={m.text}
              onBlur={(e) => update(m.id!, { text: e.target.value })}
              aria-label="Motivation line"
              className="min-w-0 flex-1 rounded-[10px] border px-2 py-1.5 text-sm"
              style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)', opacity: m.enabled ? 1 : 0.5 }}
            />
            <IconButton label="Delete line" onClick={() => remove(m.id!)}>
              ×
            </IconButton>
          </li>
        ))}
      </ul>
      <button type="button" onClick={add} className="mt-2 w-full rounded-card-sm border border-dashed py-2.5 text-sm font-medium" style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}>
        + Add line
      </button>
    </Card>
  )
}
