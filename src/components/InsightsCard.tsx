import type { WeeklyInsights } from '../lib/insights'
import Card from './Card'

function Stat({ label, value, delta, deltaGood }: { label: string; value: string; delta?: string; deltaGood?: boolean }) {
  return (
    <div>
      <div className="text-[11px]" style={{ color: 'var(--dim)' }}>{label}</div>
      <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{value}</div>
      {delta && (
        <div className="text-[11px] tabular-nums" style={{ color: deltaGood ? 'var(--good)' : 'var(--muted)' }}>
          {delta}
        </div>
      )}
    </div>
  )
}

export default function InsightsCard({ data }: { data: WeeklyInsights }) {
  const { sessions, volume, volumeDeltaPct, bodyweight, bodyweightDelta, topLifts } = data
  const hasAny = sessions > 0 || volume > 0 || bodyweight != null || topLifts.length > 0
  if (!hasAny) return null

  const volStr = volume >= 1000 ? `${(volume / 1000).toFixed(1)} t` : `${Math.round(volume)} kg`
  const volDelta = volumeDeltaPct != null ? `${volumeDeltaPct >= 0 ? '+' : ''}${volumeDeltaPct}% vs last wk` : undefined
  const bwDelta = bodyweightDelta != null ? `${bodyweightDelta >= 0 ? '+' : ''}${bodyweightDelta} kg` : undefined

  return (
    <Card className="mb-4 p-4">
      <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
        This week
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat label="Sessions" value={String(sessions)} />
        <Stat label="Volume" value={volStr} delta={volDelta} deltaGood={(volumeDeltaPct ?? 0) >= 0} />
        <Stat label="Bodyweight" value={bodyweight != null ? `${bodyweight} kg` : '—'} delta={bwDelta} />
      </div>

      {topLifts.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
            Next PRs
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {topLifts.map((l) => (
              <span
                key={l.name}
                className="rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
                style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
              >
                {l.name}: <span style={{ color: 'var(--muted)' }}>{l.e1rm}</span> → {l.nextTarget} kg
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
