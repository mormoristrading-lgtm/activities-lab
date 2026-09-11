import { useEffect, type ReactNode } from 'react'

/** A bottom-sheet style modal: backdrop + scrollable panel, ESC/backdrop to close. */
export default function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(34,31,26,.4)' }}
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-[22px] border sm:rounded-[22px]"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
      >
        <header
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--line)' }}
        >
          <h2 className="text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 text-2xl leading-none"
            style={{ color: 'var(--muted)' }}
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer
            className="border-t px-5 py-3"
            style={{
              borderColor: 'var(--line)',
              paddingBottom: 'calc(var(--safe-bottom) + 0.75rem)',
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
