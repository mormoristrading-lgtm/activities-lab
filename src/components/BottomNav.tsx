import type { ComponentType } from 'react'

export type TabKey = 'today' | 'train' | 'fuel' | 'progress' | 'lab'

type IconProps = { className?: string }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function TodayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
function TrainIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M6.5 9.5v5M17.5 9.5v5M4 12h2.5M17.5 12H20M9 8v8M15 8v8M9 12h6" />
    </svg>
  )
}
function FuelIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M7 3h10l-1 6a5 5 0 0 1-8 0L7 3Z" />
      <path d="M12 15v6M9 21h6" />
    </svg>
  )
}
function ProgressIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 19V5M4 19h16M8 16l3.5-4 3 2.5L20 8" />
    </svg>
  )
}
function LabIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M9.5 3v6L5 18a1.5 1.5 0 0 0 1.4 2.2h11.2A1.5 1.5 0 0 0 19 18l-4.5-9V3M8 3h8M9 14h6" />
    </svg>
  )
}

const TABS: { key: TabKey; label: string; Icon: ComponentType<IconProps> }[] = [
  { key: 'today', label: 'Today', Icon: TodayIcon },
  { key: 'train', label: 'Train', Icon: TrainIcon },
  { key: 'fuel', label: 'Fuel', Icon: FuelIcon },
  { key: 'progress', label: 'Progress', Icon: ProgressIcon },
  { key: 'lab', label: 'Lab', Icon: LabIcon },
]

export default function BottomNav({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-surface/95 backdrop-blur"
      style={{
        borderColor: 'var(--line)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-between px-2">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = key === active
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onChange(key)}
                className="flex w-full flex-col items-center gap-1 px-1 pt-2 pb-1.5 transition-colors"
                style={{ color: isActive ? 'var(--accent)' : 'var(--dim)' }}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[11px] font-medium tracking-wide">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
