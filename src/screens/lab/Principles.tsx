import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { db } from '../../db/db'
import type { Guidance } from '../../db/types'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import { Label, TextField } from '../../components/Field'

export default function Principles() {
  const items = useLiveQuery(() => db.guidance.orderBy('order').toArray(), [])
  const [editing, setEditing] = useState<Guidance | null>(null)
  if (!items) return null

  return (
    <Card className="p-4">
      <h2 className="mb-2 text-base font-semibold">Principles</h2>
      <div className="space-y-4">
        {items.map((g) => (
          <div key={g.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {g.title}
              </h3>
              <button type="button" onClick={() => setEditing(g)} className="text-xs" style={{ color: 'var(--dim)' }}>
                Edit
              </button>
            </div>
            <div className="markdown mt-1 text-sm" style={{ color: 'var(--text)' }}>
              <Markdown remarkPlugins={[remarkGfm]}>{g.body}</Markdown>
            </div>
          </div>
        ))}
      </div>
      {editing && <PrincipleEditor item={editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function PrincipleEditor({ item, onClose }: { item: Guidance; onClose: () => void }) {
  const [title, setTitle] = useState(item.title)
  const [body, setBody] = useState(item.body)

  async function save() {
    await db.guidance.update(item.id!, { title, body })
    onClose()
  }

  return (
    <Modal
      title="Edit principle"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-card-sm border py-2.5 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}>
            Cancel
          </button>
          <button type="button" onClick={save} className="flex-1 rounded-card-sm py-2.5 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Title</Label>
          <TextField value={title} onChange={setTitle} ariaLabel="Principle title" />
        </div>
        <div>
          <Label>Body (markdown)</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>
      </div>
    </Modal>
  )
}
