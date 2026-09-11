export type Segment<T extends string> = { key: T; label: string }

/** A pill segmented control — used inside Train (Program / Session / Library). */
export default function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
}: {
  segments: Segment<T>[]
  value: T
  onChange: (key: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 rounded-card-sm border p-1"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
    >
      {segments.map((s) => {
        const isActive = s.key === value
        return (
          <button
            key={s.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(s.key)}
            className="flex-1 rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: isActive ? 'var(--surface)' : 'transparent',
              color: isActive ? 'var(--text)' : 'var(--dim)',
              boxShadow: isActive ? '0 1px 2px rgba(34,31,26,.08)' : 'none',
            }}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
