import { useState } from 'react'
import type { DayLookup } from '../../lib/calendar'
import { bucketOf, heatmapColumns } from '../../lib/calendar'
import { parseLocalISO, todayISO } from '../../lib/date'
import Card from '../../components/Card'
import { SelectField } from '../../components/Field'

const WEEKS = 26
const GOOD_RGB = '94,122,62' // --good as rgb, so we can vary alpha per bucket

type Metric = 'volume' | 'runs' | 'standards'

const METRICS: { value: Metric; label: string; unit: string }[] = [
  { value: 'volume', label: 'Training volume', unit: 'kg' },
  { value: 'runs', label: 'Runs', unit: 'km' },
  { value: 'standards', label: 'Standards', unit: '%' },
]

function metricValue(metric: Metric, lookup: DayLookup, date: string): number {
  const s = lookup(date)
  if (metric === 'volume') return s.volume
  if (metric === 'runs') return s.runKm
  return s.standardsTotal > 0 ? Math.round((s.standardsDone / s.standardsTotal) * 100) : 0
}

function bucketColor(b: number): string {
  return b <= 0 ? 'var(--track)' : `rgba(${GOOD_RGB},${0.25 * b})`
}

export default function Heatmap({ lookup }: { lookup: DayLookup }) {
  const [metric, setMetric] = useState<Metric>('volume')
  const [picked, setPicked] = useState<{ date: string; value: number } | null>(null)

  const today = todayISO()
  const cols = heatmapColumns(today, WEEKS)
  const unit = METRICS.find((m) => m.value === metric)!.unit

  // Window max → relative intensity buckets (future days excluded).
  let max = 0
  for (const col of cols) {
    for (const d of col) {
      if (d <= today) max = Math.max(max, metricValue(metric, lookup, d))
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Consistency</h2>
        <div className="w-40">
          <SelectField
            value={metric}
            onChange={setMetric}
            ariaLabel="Heatmap metric"
            options={METRICS.map((m) => ({ value: m.value, label: m.label }))}
          />
        </div>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
        {shortLabel(cols[0][0])} – {shortLabel(today)}
      </p>

      <div className="mt-3 flex gap-1.5">
        {/* weekday labels (Mon/Wed/Fri) */}
        <div className="flex flex-col gap-[3px] pt-px">
          {['M', '', 'W', '', 'F', '', ''].map((d, i) => (
            <span key={i} className="h-[11px] text-[8px] leading-[11px]" style={{ color: 'var(--muted)' }}>
              {d}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
            {cols.flat().map((date) => {
              const future = date > today
              const value = future ? 0 : metricValue(metric, lookup, date)
              const b = future ? 0 : bucketOf(value, max)
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => !future && setPicked({ date, value })}
                  aria-label={`${date}: ${value} ${unit}`}
                  className="h-[11px] w-[11px] rounded-[2px]"
                  style={{
                    background: future ? 'transparent' : bucketColor(b),
                    cursor: future ? 'default' : 'pointer',
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
        <span>{picked ? `${fullLabel(picked.date)} · ${picked.value} ${unit}` : 'Tap a day for details'}</span>
        <span className="flex items-center gap-1">
          Less
          {[0, 1, 2, 3, 4].map((b) => (
            <span key={b} className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: bucketColor(b) }} />
          ))}
          More
        </span>
      </div>
    </Card>
  )
}

function shortLabel(iso: string): string {
  return parseLocalISO(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function fullLabel(iso: string): string {
  return parseLocalISO(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
