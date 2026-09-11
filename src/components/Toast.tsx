/** Transient bottom-center confirmation pill. Renders nothing when message is null. */
export default function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{ bottom: 'calc(var(--safe-bottom) + 5rem)' }}
      role="status"
      aria-live="polite"
    >
      <span
        className="rounded-full px-4 py-2 text-sm font-semibold shadow-lg"
        style={{ background: 'var(--text)', color: 'var(--bg)' }}
      >
        {message}
      </span>
    </div>
  )
}
