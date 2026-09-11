import { useState, type ReactNode } from 'react'
import type { DayLookup, DaySummary } from '../../lib/calendar'
import { dayStatus, monthMatrix } from '../../lib/calendar'
import { parseLocalISO, todayISO } from '../../lib/date'
import Card from '../../components/Card'
import Modal from '../../components/Modal'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Faint training tints — green = complete, clay = partial, track = planned-not-done.
const STATUS_BG: Record<string, string> = {
  complete: 'rgba(94,122,62,.22)',
  partial: 'rgba(180,95,56,.20)',
  planned: 'var(--track)',
  rest: 'transparent',
  empty: 'transparent',
}

export default function MonthCalendar({ lookup }: { lookup: DayLookup }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const weeks = monthMatrix(year, month)
  const today = todayISO()
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="rounded-card-sm px-3 py-1 text-lg leading-none"
          style={{ color: 'var(--dim)' }}
        >
          ‹
        </button>
        <h2 className="text-base font-semibold">{monthLabel}</h2>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="rounded-card-sm px-3 py-1 text-lg leading-none"
          style={{ color: 'var(--dim)' }}
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
            {d}
          </div>
        ))}
        {weeks.flat().map((cell) => {
          const s = lookup(cell.iso)
          const status = dayStatus(s)
          const isToday = cell.iso === today
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => setSelected(cell.iso)}
              className="relative flex aspect-square flex-col items-center justify-center rounded-[9px] text-xs"
              style={{
                background: cell.inMonth ? STATUS_BG[status] : 'transparent',
                color: cell.inMonth ? 'var(--text)' : 'var(--muted)',
                opacity: cell.inMonth ? 1 : 0.4,
                border: isToday ? '1.5px solid var(--accent)' : '1.5px solid transparent',
              }}
            >
              <span className="tabular-nums">{cell.day}</span>
              {(s.runKm > 0 || (s.standardsTotal > 0 && s.standardsDone >= s.standardsTotal)) && (
                <span className="mt-0.5 flex gap-0.5">
                  {s.runKm > 0 && <Dot color="var(--accent-2)" />}
                  {s.standardsTotal > 0 && s.standardsDone >= s.standardsTotal && <Dot color="var(--good)" />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Legend />

      {selected && <DayDetail summary={lookup(selected)} onClose={() => setSelected(null)} />}
    </Card>
  )
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-1 w-1 rounded-full" style={{ background: color }} />
}

function Legend() {
  const items = [
    { label: 'Complete', bg: STATUS_BG.complete },
    { label: 'Partial', bg: STATUS_BG.partial },
    { label: 'Planned', bg: STATUS_BG.planned },
  ]
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px]" style={{ color: 'var(--muted)' }}>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: i.bg }} />
          {i.label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <Dot color="var(--accent-2)" /> Run
      </span>
    </div>
  )
}

function pctColor(pct: number | null): string {
  if (pct === 100) return 'var(--good)'
  if ((pct ?? 0) > 0) return 'var(--accent)'
  return 'var(--muted)'
}

function DayDetail({ summary: s, onClose }: { summary: DaySummary; onClose: () => void }) {
  const dateLabel = parseLocalISO(s.date).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const extra = s.loggedTitles.filter((t) => t !== s.scheduledTitle)
  return (
    <Modal title={dateLabel} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <Row label="Training">
          {s.scheduledTitle ? (
            <span>
              {s.scheduledTitle} ·{' '}
              <b style={{ color: pctColor(s.sessionPct) }}>{s.sessionPct ?? 0}%</b>
            </span>
          ) : s.trained ? (
            <span>{s.loggedTitles.join(', ')}</span>
          ) : s.isRest ? (
            <span style={{ color: 'var(--muted)' }}>Rest day</span>
          ) : (
            <span style={{ color: 'var(--muted)' }}>No gym session</span>
          )}
        </Row>
        {s.scheduledTitle && extra.length > 0 && <Row label="Also logged">{extra.join(', ')}</Row>}
        <Row label="Runs">
          {s.runCount > 0 ? `${s.runKm} km · ${s.runCount} run${s.runCount > 1 ? 's' : ''}` : '—'}
        </Row>
        <Row label="Standards">{s.standardsTotal > 0 ? `${s.standardsDone}/${s.standardsTotal}` : '—'}</Row>
        <Row label="Bodyweight">{s.weighedIn ? `${s.bodyweight} kg` : '—'}</Row>
      </div>
    </Modal>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span style={{ color: 'var(--dim)' }}>{label}</span>
      <span className="text-right" style={{ color: 'var(--text)' }}>
        {children}
      </span>
    </div>
  )
}
