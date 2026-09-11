import type { ReactNode } from 'react'

/** A rounded, hairline-bordered surface card — the base building block of the UI. */
export default function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-card border bg-surface ${className}`}
      style={{ borderColor: 'var(--line)' }}
    >
      {children}
    </div>
  )
}
