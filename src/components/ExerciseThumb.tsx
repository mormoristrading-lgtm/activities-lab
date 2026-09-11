import { useState } from 'react'

interface Props {
  src?: string
  alt?: string
  /** Tailwind sizing utility, e.g. 'h-10 w-10' (default) or 'h-12 w-12'. */
  size?: string
  /** Optional explicit border-radius class. */
  rounded?: string
  className?: string
}

/** Square exercise photo with a graceful fallback when src is empty/broken. */
export default function ExerciseThumb({
  src,
  alt = '',
  size = 'h-10 w-10',
  rounded = 'rounded-[7px]',
  className = '',
}: Props) {
  const [errored, setErrored] = useState(false)
  const show = !!src && !errored
  return (
    <span
      className={`shrink-0 overflow-hidden ${size} ${rounded} ${className}`}
      style={{ background: 'var(--surface-2)' }}
      aria-hidden={alt ? undefined : true}
    >
      {show ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center" style={{ color: 'var(--muted)' }}>
          <svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </span>
      )}
    </span>
  )
}
