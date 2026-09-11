import { useEffect, useRef, useState } from 'react'
import { db } from '../../db/db'
import type { Measurement, Media } from '../../db/types'
import { todayISO } from '../../lib/date'
import { compressImage, UnsupportedImageError } from '../../lib/image'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import { IconButton, Label, NumberField } from '../../components/Field'

const FIELDS: { k: keyof Measurement; label: string }[] = [
  { k: 'chest', label: 'Chest' },
  { k: 'waist', label: 'Waist' },
  { k: 'arm_l', label: 'Arm L' },
  { k: 'arm_r', label: 'Arm R' },
  { k: 'thigh_l', label: 'Thigh L' },
  { k: 'thigh_r', label: 'Thigh R' },
]

export default function BodyLog({ measurements, photos }: { measurements: Measurement[]; photos: Media[] }) {
  const [editing, setEditing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<Record<number, string>>({})

  const latest = measurements.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null
  const photoKey = photos.map((p) => p.id).join(',')

  useEffect(() => {
    const map: Record<number, string> = {}
    for (const p of photos) if (p.id != null) map[p.id] = URL.createObjectURL(p.blob)
    setUrls(map)
    return () => {
      for (const u of Object.values(map)) URL.revokeObjectURL(u)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  async function onPhoto(file: File) {
    setPhotoError('')
    try {
      const blob = await compressImage(file)
      await db.media.add({ exerciseId: 0, date: todayISO(), blob })
    } catch (e) {
      setPhotoError(
        e instanceof UnsupportedImageError
          ? "That image format isn't supported — try a JPEG or PNG."
          : "Couldn't save the photo — your device storage may be full.",
      )
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Body log</h2>
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          Update
        </button>
      </div>

      {/* Measurements */}
      {latest ? (
        <div className="grid grid-cols-3 gap-2">
          {FIELDS.map((f) => (
            <div key={f.k} className="rounded-card-sm border p-2 text-center" style={{ borderColor: 'var(--line)' }}>
              <div className="text-[11px]" style={{ color: 'var(--dim)' }}>
                {f.label}
              </div>
              <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
                {latest[f.k] != null ? `${latest[f.k]}` : '—'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No measurements yet — tap Update to log your baseline (cm).
        </p>
      )}

      {/* Photos */}
      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-sm font-medium" style={{ color: 'var(--dim)' }}>
          Photos
        </h3>
        <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          + Add photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onPhoto(f)
            e.target.value = ''
          }}
        />
      </div>
      {photoError && (
        <p className="mt-2 text-xs" role="alert" style={{ color: 'var(--accent)' }}>
          {photoError}
        </p>
      )}
      {photos.length > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {photos
            .slice()
            .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
            .map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-card-sm" style={{ aspectRatio: '3/4' }}>
                {p.id != null && urls[p.id] && <img src={urls[p.id]} alt={p.date ?? 'photo'} className="h-full w-full object-cover" />}
                <div className="absolute right-1 top-1">
                  <IconButton label="Delete photo" onClick={() => db.media.delete(p.id!)}>
                    ×
                  </IconButton>
                </div>
                <span className="absolute bottom-1 left-1 rounded px-1 text-[10px]" style={{ background: 'rgba(34,31,26,.55)', color: 'var(--on-accent)' }}>
                  {p.date}
                </span>
              </div>
            ))}
        </div>
      ) : (
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
          Add a progress photo to track changes over time.
        </p>
      )}

      {editing && <MeasureForm latest={latest} onClose={() => setEditing(false)} />}
    </Card>
  )
}

function MeasureForm({ latest, onClose }: { latest: Measurement | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Measurement>({ ...(latest ?? {}), date: todayISO() })
  const setNum = (k: keyof Measurement) => (v: number | null) =>
    setDraft((d) => ({ ...d, [k]: v ?? undefined }) as Measurement)

  async function save() {
    await db.measurements.put({ ...draft, date: todayISO() })
    onClose()
  }

  return (
    <Modal
      title="Update measurements (cm)"
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
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.k}>
            <Label>{f.label}</Label>
            <NumberField value={(draft[f.k] as number | undefined) ?? null} step={0.5} onChange={setNum(f.k)} ariaLabel={f.label} />
          </div>
        ))}
      </div>
    </Modal>
  )
}
