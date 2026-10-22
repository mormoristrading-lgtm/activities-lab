import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { buzz } from '../lib/haptics'

// Isolation · hypertrophy · heavy compound (matches the Rest periods principle).
const PRESETS = [60, 90, 180]

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** One-tap rest timer: pick a length, it counts down, then buzzes (and notifies if the app is backgrounded). */
export default function RestTimer() {
  const setting = useLiveQuery(() => db.settings.get('restNotifications'), [])
  const notifyOn = setting?.value !== false

  const [remaining, setRemaining] = useState<number | null>(null)
  const endRef = useRef(0)
  const running = remaining != null

  useEffect(() => {
    if (!running) return
    // Tick off the wall clock, not a counter, so a backgrounded/throttled tab stays accurate.
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        window.clearInterval(id)
        buzz(300)
        if (notifyOn && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Rest done', { body: 'Back to it.' })
        }
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running, notifyOn])

  function start(sec: number) {
    endRef.current = Date.now() + sec * 1000
    setRemaining(sec)
    buzz()
  }

  if (!running) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--dim)' }}>
          Rest
        </span>
        {PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => start(s)}
            className="flex-1 rounded-card-sm border py-2.5 text-sm font-semibold tabular-nums"
            style={{ borderColor: 'var(--line)', color: 'var(--text)', background: 'var(--surface)' }}
          >
            {fmt(s)}
          </button>
        ))}
      </div>
    )
  }

  const done = remaining === 0
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-card-sm py-2.5 text-center text-lg font-semibold tabular-nums"
        style={{ background: done ? 'var(--good)' : 'var(--accent)', color: 'var(--on-accent)' }}
        role="timer"
        aria-live={done ? 'assertive' : 'off'}
      >
        {done ? 'Rest done — go' : fmt(remaining)}
      </div>
      {!done && (
        <button
          type="button"
          onClick={() => {
            endRef.current += 15_000
            setRemaining((r) => (r ?? 0) + 15)
          }}
          className="rounded-card-sm border px-3 py-2.5 text-sm font-semibold"
          style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
        >
          +15s
        </button>
      )}
      <button
        type="button"
        aria-label="Stop rest timer"
        onClick={() => setRemaining(null)}
        className="rounded-card-sm border px-3.5 py-2.5 text-sm"
        style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
      >
        ×
      </button>
    </div>
  )
}
