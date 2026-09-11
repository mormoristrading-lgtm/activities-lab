import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { toggleLiked } from '../lib/library'

interface Props {
  exerciseId: number | null
  /** When the exercise row isn't created yet (e.g. on a Library card) the
   * parent should pre-create it and then call back with the new id.
   * If you pass `prepareId`, this component will call it on first click. */
  prepareId?: () => Promise<number | null>
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}

export default function LikeButton({ exerciseId, prepareId, size = 'md', className = '', ariaLabel }: Props) {
  const ex = useLiveQuery(
    async () => (exerciseId != null ? await db.exercises.get(exerciseId) : undefined),
    [exerciseId],
  )
  const liked = ex?.liked === true

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    let id = exerciseId
    if (id == null && prepareId) id = await prepareId()
    if (id == null) return
    await toggleLiked(id)
  }

  const px = size === 'sm' ? 16 : 20
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={ariaLabel ?? (liked ? 'Unlike exercise' : 'Like exercise')}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        width: size === 'sm' ? 28 : 36,
        height: size === 'sm' ? 28 : 36,
        background: liked ? 'var(--accent)' : 'rgba(0,0,0,0.35)',
        color: liked ? 'var(--on-accent)' : '#fff',
      }}
    >
      <svg width={px} height={px} viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
