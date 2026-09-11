import { useState, type ReactNode } from 'react'

// Light client-side passcode gate. The code is stored only as a one-way hash
// (cyrb53) — not as plaintext — and once entered correctly on a device the
// unlock flag is remembered in localStorage so it isn't asked again.
// This keeps casual visitors out of a shared link; it is not strong security.
const CODE_HASH = 3235463490425827
const UNLOCK_KEY = 'al_unlock'

function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export default function LockGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem(UNLOCK_KEY) === '1'
    } catch {
      return false
    }
  })
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (cyrb53(code.trim()) === CODE_HASH) {
      try {
        localStorage.setItem(UNLOCK_KEY, '1')
      } catch {
        /* private mode — unlock for this session anyway */
      }
      setUnlocked(true)
    } else {
      setError(true)
      setCode('')
    }
  }

  return (
    <div
      className="grid min-h-dvh place-items-center px-6"
      style={{ background: 'var(--bg)' }}
    >
      <form onSubmit={submit} className="w-full max-w-xs text-center">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
          Activities Lab
        </p>
        <h1 className="mt-2 mb-1 text-xl font-semibold" style={{ color: 'var(--text)' }}>
          Enter passcode
        </h1>
        <p className="mb-5 text-sm" style={{ color: 'var(--muted)' }}>
          Just once on this device.
        </p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (error) setError(false)
          }}
          aria-label="Passcode"
          placeholder="••••••"
          className="w-full rounded-[12px] border px-4 py-3 text-center text-lg tracking-[0.3em] outline-none"
          style={{
            borderColor: error ? 'var(--bad, #b3261e)' : 'var(--line)',
            background: 'var(--surface-2)',
            color: 'var(--text)',
          }}
        />
        {error && (
          <p className="mt-2 text-sm" style={{ color: 'var(--bad, #b3261e)' }}>
            Wrong passcode — try again.
          </p>
        )}

        <button
          type="submit"
          disabled={!code.trim()}
          className="mt-4 w-full rounded-[12px] py-3 text-sm font-semibold disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          Unlock
        </button>
      </form>
    </div>
  )
}
