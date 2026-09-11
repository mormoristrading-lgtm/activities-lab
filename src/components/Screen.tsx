import type { ReactNode } from 'react'

/** Consistent screen wrapper: eyebrow + title header, then content. */
export default function Screen({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="mx-auto max-w-xl">
      <header className="mb-5">
        <p
          className="text-xs font-semibold tracking-[0.14em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          {eyebrow}
        </p>
        <h1 className="mt-1 text-3xl" style={{ color: 'var(--text)' }}>
          {title}
        </h1>
      </header>
      {children}
    </section>
  )
}

/** A small "coming in a later phase" note used on the placeholder screens. */
export function PhaseNote({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-4 rounded-card-sm border border-dashed px-4 py-3 text-sm"
      style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
    >
      {children}
    </p>
  )
}
