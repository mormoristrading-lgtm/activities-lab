import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { LibraryExercise } from '../../db/types'
// Load the big dataset as a precached URL asset + fetch (avoids tsc inferring a
// giant JSON literal type, and the SW serves it offline once cached).
import datasetUrl from '../../data/exercises.json?url'
import programImagesJson from '../../data/program-images.json'
import { RUNNING_DRILLS } from '../../data/running-drills'
import { DISCIPLINES, MUSCLE_GROUPS, disciplineOf, ensureExerciseFromLibrary, stretchesForMuscles, type Discipline } from '../../lib/library'
import Modal from '../../components/Modal'
import LikeButton from '../../components/LikeButton'
import { TextField } from '../../components/Field'

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const imgUrl = (rel?: string) => (rel ? IMG_BASE + rel : '')

// dataset ids that are part of the user's program (from the bundled image filenames)
const programIds = new Set(
  Object.values(programImagesJson as Record<string, string>).map((p) =>
    p.replace('/exercise-images/', '').replace('.jpg', ''),
  ),
)

const MUSCLE_CHIPS = [{ key: 'all', label: 'All', muscles: [] as string[] }, ...MUSCLE_GROUPS]

const PAGE = 24

export default function Library() {
  const [data, setData] = useState<LibraryExercise[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [disc, setDisc] = useState<Discipline>('gym')
  const [muscle, setMuscle] = useState('all')
  const [likedOnly, setLikedOnly] = useState(false)
  const [visible, setVisible] = useState(PAGE)
  const [selected, setSelected] = useState<LibraryExercise | null>(null)

  // The Liked filter joins against db.exercises (the only place `liked` lives).
  // IndexedDB doesn't reliably index booleans across browsers, so we filter.
  const likedExercises = useLiveQuery(
    () => db.exercises.filter((e) => e.liked === true).toArray(),
    [],
  )
  const likedSlugs = useMemo(
    () => new Set((likedExercises ?? []).map((e) => e.slug).filter(Boolean) as string[]),
    [likedExercises],
  )
  const exIdBySlug = useMemo(
    () => new Map((likedExercises ?? []).map((e) => [e.slug ?? '', e.id!])),
    [likedExercises],
  )

  const load = useCallback(() => {
    setError(false)
    setData(null)
    fetch(datasetUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      // Curated running drills aren't in the dataset — prepend them.
      .then((d: LibraryExercise[]) => setData([...RUNNING_DRILLS, ...d]))
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const q = query.trim().toLowerCase()
  const matchesQ = useCallback((e: LibraryExercise) => !q || e.name.toLowerCase().includes(q), [q])

  // Exercises of the selected discipline, then the optional gym muscle filter.
  const inDiscipline = useMemo(
    () => (data ?? []).filter((e) => disciplineOf(e) === disc),
    [data, disc],
  )

  const muscleGroup = disc === 'gym' && muscle !== 'all'
    ? MUSCLE_GROUPS.find((g) => g.key === muscle)
    : undefined

  const main = useMemo(() => {
    return inDiscipline.filter((e) => {
      if (!matchesQ(e)) return false
      if (muscleGroup && !e.primaryMuscles.some((m) => muscleGroup.muscles.includes(m))) return false
      if (likedOnly && !likedSlugs.has(e.id)) return false
      return true
    })
  }, [inDiscipline, matchesQ, muscleGroup, likedOnly, likedSlugs])

  // "Stretches for that muscle, before the gym exercises" — only when a Gym
  // muscle group is selected.
  const stretches = useMemo(() => {
    if (!muscleGroup || !data) return []
    return stretchesForMuscles(data, muscleGroup.muscles).filter(matchesQ)
  }, [data, muscleGroup, matchesQ])

  // reset pagination when any filter changes
  useEffect(() => setVisible(PAGE), [query, disc, muscle, likedOnly])

  if (error) {
    return (
      <div className="space-y-3">
        <p style={{ color: 'var(--dim)' }}>
          Couldn't load the exercise library{!navigator.onLine ? ' (you appear to be offline)' : ''}.
        </p>
        <button
          type="button"
          onClick={load}
          className="rounded-card-sm px-4 py-2 text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          Retry
        </button>
      </div>
    )
  }
  if (!data) return <p style={{ color: 'var(--muted)' }}>Loading library…</p>

  const card = (e: LibraryExercise) => {
    const existingId = exIdBySlug.get(e.id) ?? null
    return (
      <div
        key={e.id}
        className="relative overflow-hidden rounded-card border"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <button type="button" onClick={() => setSelected(e)} className="block w-full text-left">
          <div className="aspect-[4/3] w-full" style={{ background: 'var(--surface-2)' }}>
            {e.images[0] && (
              <img src={imgUrl(e.images[0])} alt={e.name} loading="lazy" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="p-2.5">
            <div className="flex items-start gap-1">
              <span className="line-clamp-2 flex-1 text-xs font-medium" style={{ color: 'var(--text)' }}>
                {e.name}
              </span>
              {programIds.has(e.id) && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ background: 'var(--accent-2)', color: 'var(--on-accent)' }}
                >
                  PROGRAM
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[10px] capitalize" style={{ color: 'var(--muted)' }}>
              {e.primaryMuscles[0] ?? e.category}
              {e.equipment ? ` · ${e.equipment}` : ''}
            </div>
          </div>
        </button>
        <div className="absolute top-1.5 right-1.5">
          <LikeButton
            exerciseId={existingId}
            prepareId={async () => ensureExerciseFromLibrary(e)}
            size="sm"
            ariaLabel={`Like ${e.name}`}
          />
        </div>
      </div>
    )
  }

  const sectionLabel = (text: string) => (
    <p className="pt-1 text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
      {text}
    </p>
  )

  return (
    <div className="space-y-3">
      <TextField value={query} onChange={setQuery} placeholder="Search exercises…" ariaLabel="Search library" />

      {/* Discipline selector */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setLikedOnly((v) => !v)}
          aria-pressed={likedOnly}
          className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium"
          style={{
            borderColor: likedOnly ? 'var(--accent)' : 'var(--line)',
            background: likedOnly ? 'var(--accent)' : 'transparent',
            color: likedOnly ? 'var(--on-accent)' : 'var(--dim)',
          }}
        >
          ♥ Liked{likedSlugs.size ? ` · ${likedSlugs.size}` : ''}
        </button>
        {DISCIPLINES.map((d) => {
          const active = d.key === disc
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setDisc(d.key)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--line)',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--on-accent)' : 'var(--dim)',
              }}
            >
              {d.label}
            </button>
          )
        })}
      </div>

      {/* Muscle sub-filter (Gym only) */}
      {disc === 'gym' && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {MUSCLE_CHIPS.map((c) => {
            const active = c.key === muscle
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setMuscle(c.key)}
                className="shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium"
                style={{
                  borderColor: active ? 'var(--accent-2)' : 'var(--line)',
                  background: active ? 'var(--accent-2)' : 'transparent',
                  color: active ? 'var(--on-accent)' : 'var(--muted)',
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
        {main.length} exercises{stretches.length ? ` · ${stretches.length} stretches` : ''}
      </p>

      {/* Stretches for the selected muscle, shown before the gym exercises */}
      {stretches.length > 0 && (
        <>
          {sectionLabel(`Stretches · ${muscleGroup!.label}`)}
          <div className="grid grid-cols-2 gap-3">{stretches.map(card)}</div>
          {sectionLabel('Exercises')}
        </>
      )}

      <div className="grid grid-cols-2 gap-3">{main.slice(0, visible).map(card)}</div>

      {visible < main.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE)}
          className="w-full rounded-card-sm border py-2.5 text-sm font-medium"
          style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
        >
          Load more ({main.length - visible} left)
        </button>
      )}

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="space-y-3">
            {selected.images[0] && (
              <div
                className="relative w-full overflow-hidden rounded-card-sm"
                style={{ aspectRatio: '4 / 3', background: 'var(--surface-2)' }}
              >
                <img
                  src={imgUrl(selected.images[1] ?? selected.images[0])}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <img
                  src={imgUrl(selected.images[0])}
                  alt={selected.name}
                  className="ex-clip-top absolute inset-0 h-full w-full object-contain"
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[selected.category, selected.equipment, ...selected.primaryMuscles].filter(Boolean).map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full border px-2 py-0.5 text-[11px] capitalize"
                    style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <LikeButton
                exerciseId={exIdBySlug.get(selected.id) ?? null}
                prepareId={async () => ensureExerciseFromLibrary(selected)}
                ariaLabel={`Like ${selected.name}`}
              />
            </div>
            {selected.instructions.length > 0 && (
              <ol className="list-decimal space-y-1.5 pl-5 text-sm" style={{ color: 'var(--text)' }}>
                {selected.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
