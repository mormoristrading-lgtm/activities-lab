import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { todayISO } from '../../lib/date'
import Card from '../../components/Card'
import { IconButton } from '../../components/Field'

export default function Journal() {
  const entries = useLiveQuery(async () => (await db.journal.toArray()).filter((j) => j.type === 'note'), [])
  const [text, setText] = useState('')
  if (!entries) return null

  async function add() {
    if (!text.trim()) return
    await db.journal.add({ date: todayISO(), type: 'note', text: text.trim() })
    setText('')
  }

  const sorted = entries.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))

  return (
    <Card className="p-4">
      <h2 className="mb-2 text-base font-semibold">Journal</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="A thought, a win, a note to self…"
        className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
      />
      <button type="button" onClick={add} disabled={!text.trim()} className="mt-2 w-full rounded-card-sm py-2.5 text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
        Add entry
      </button>

      {sorted.length > 0 && (
        <ul className="mt-3 space-y-2">
          {sorted.map((e) => (
            <li key={e.id} className="flex items-start gap-2 rounded-card-sm border p-3" style={{ borderColor: 'var(--line)' }}>
              <div className="min-w-0 flex-1">
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {e.date}
                </div>
                <p className="mt-0.5 text-sm whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                  {e.text}
                </p>
              </div>
              <IconButton label="Delete entry" onClick={() => db.journal.delete(e.id!)}>
                ×
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
