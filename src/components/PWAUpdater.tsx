import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows an "Update" banner when a new deployed version is available.
 * While the app is open (and online) it re-checks for updates every 60s, so a
 * new release is picked up without needing a fresh URL or a reinstall.
 */
export default function PWAUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          void registration.update()
        }, 60_000)
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div
      className="fixed inset-x-0 z-40 mx-auto flex max-w-xl px-4"
      style={{ top: 'calc(var(--safe-top) + 0.5rem)' }}
    >
      <div
        className="flex flex-1 items-center gap-3 rounded-card border px-4 py-2.5 shadow-lg"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>
          A new version is available.
        </span>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-[8px] px-2 py-1 text-xs font-medium"
          style={{ color: 'var(--dim)' }}
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-[8px] px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          Update
        </button>
      </div>
    </div>
  )
}
