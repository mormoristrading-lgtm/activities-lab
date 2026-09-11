import type { ReactNode } from 'react'

const base =
  'w-full rounded-[10px] border px-3 py-2 text-sm outline-none focus-visible:outline-2'

const fieldStyle = {
  borderColor: 'var(--line)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
} as const

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--dim)' }}>
      {children}
    </span>
  )
}

export function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <input
      type="text"
      className={base}
      style={fieldStyle}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function NumberField({
  value,
  onChange,
  min = 0,
  step = 1,
  ariaLabel,
}: {
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  step?: number
  ariaLabel?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`${base} tabular-nums`}
      style={fieldStyle}
      value={value ?? ''}
      min={min}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = Number(raw)
        if (Number.isNaN(n)) return // ignore invalid intermediate input (e.g. "-")
        onChange(n < min ? min : n) // never store below the minimum (no negatives)
      }}
    />
  )
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  ariaLabel?: string
}) {
  return (
    <select
      className={base}
      style={fieldStyle}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function IconButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-[9px] border text-sm disabled:opacity-30"
      style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
    >
      {children}
    </button>
  )
}
