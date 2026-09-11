import { useState } from 'react'

function isIos(): boolean {
  const ua = navigator.userAgent
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports as MacIntel but has touch points
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOS
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * iOS fires no `beforeinstallprompt`, so we can't trigger install from JS.
 * Show a gentle hint telling the user how to add the app to the home screen.
 */
export default function InstallHint() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !isIos() || isStandalone()) return null

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-card border px-4 py-3 text-sm"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
    >
      <span aria-hidden="true" className="mt-0.5 text-base">
        📲
      </span>
      <p className="flex-1" style={{ color: 'var(--dim)' }}>
        Install Activities Lab: tap the{' '}
        <span style={{ color: 'var(--text)' }}>Share</span> button, then{' '}
        <span style={{ color: 'var(--text)' }}>Add to Home Screen</span>. It then works fully
        offline.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install hint"
        className="shrink-0 rounded-md px-1 text-lg leading-none"
        style={{ color: 'var(--muted)' }}
      >
        ×
      </button>
    </div>
  )
}
