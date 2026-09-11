import type { DailyLog, Nutrition } from '../db/types'
import { addMeal, updateDaily } from '../lib/daily'
import { buzz } from '../lib/haptics'
import Card from '../components/Card'
import { NumberField } from '../components/Field'

const r1 = (n: number) => Math.round(n * 10) / 10
const SLEEP_CHIPS = [6, 6.5, 7, 7.5, 8, 8.5, 9]
const PROTEIN_CHIPS = [20, 30, 40]

export default function QuickLog({
  daily,
  nutrition,
  lastWeight,
  onFlash,
}: {
  daily: DailyLog | null | undefined
  nutrition: Nutrition
  lastWeight: number | null
  onFlash: (m: string) => void
}) {
  function save(patch: (c: DailyLog) => Partial<DailyLog>, msg = 'Saved ✓') {
    void updateDaily(patch)
    buzz()
    onFlash(msg)
  }

  function logProtein(g: number) {
    void addMeal({ name: `Protein +${g}g`, protein_g: g, kcal: g * 4, carbs_g: 0, fat_g: 0 })
    buzz()
    onFlash(`+${g}g protein`)
  }

  function toggleCreatine() {
    const on = !daily?.creatine
    save((c) => {
      const supp = nutrition.supplements.find((s) => /creatine/i.test(s))
      const supplementsDone = supp ? { ...(c.supplementsDone ?? {}), [supp]: on } : c.supplementsDone
      return { creatine: on, supplementsDone }
    }, on ? 'Creatine ✓' : 'Creatine cleared')
  }

  const weightBase = daily?.bodyweight_kg ?? lastWeight ?? 70
  const water = daily?.water_l ?? 0
  const protein = daily?.protein_g ?? 0

  const stepBtn =
    'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border text-lg leading-none'
  const chip = (active: boolean) =>
    ({
      borderColor: active ? 'var(--accent)' : 'var(--line)',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--on-accent)' : 'var(--dim)',
    }) as const

  return (
    <Card className="p-4">
      <p className="mb-3 text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
        Quick log
      </p>

      <div className="space-y-3.5">
        {/* Weigh-in */}
        <Row label="Weigh-in" hint={daily?.bodyweight_kg == null && lastWeight != null ? `last ${lastWeight} kg` : undefined}>
          <button type="button" aria-label="Weight down 0.1" className={stepBtn} style={{ borderColor: 'var(--line)', color: 'var(--dim)' }}
            onClick={() => save((c) => ({ bodyweight_kg: r1((c.bodyweight_kg ?? lastWeight ?? weightBase) - 0.1) }))}>
            −
          </button>
          <div className="w-20">
            <NumberField value={daily?.bodyweight_kg ?? null} step={0.1} onChange={(v) => void updateDaily(() => ({ bodyweight_kg: v ?? undefined }))} ariaLabel="Bodyweight (kg)" />
          </div>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>kg</span>
          <button type="button" aria-label="Weight up 0.1" className={stepBtn} style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}
            onClick={() => save((c) => ({ bodyweight_kg: r1((c.bodyweight_kg ?? lastWeight ?? weightBase) + 0.1) }))}>
            +
          </button>
        </Row>

        {/* Sleep */}
        <Row label="Sleep">
          <div className="flex flex-wrap gap-1.5">
            {SLEEP_CHIPS.map((h) => (
              <button key={h} type="button" onClick={() => save(() => ({ sleep_h: h }), `Sleep ${h}h ✓`)}
                className="rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums" style={chip(daily?.sleep_h === h)}>
                {h}
              </button>
            ))}
          </div>
        </Row>

        {/* Energy */}
        <Row label="Energy">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`Energy ${n}`} onClick={() => save(() => ({ energy: n }), `Energy ${n}/5`)}
                className="grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold" style={chip(daily?.energy === n)}>
                {n}
              </button>
            ))}
          </div>
        </Row>

        {/* Water */}
        <Row label="Water" hint={`${water.toFixed(2)} / ${nutrition.water_l} L`}>
          <button type="button" className={stepBtn} style={{ borderColor: 'var(--line)', color: 'var(--dim)' }} aria-label="Water minus 0.25"
            onClick={() => save((c) => ({ water_l: Math.max(0, r1((c.water_l ?? 0) - 0.25)) }), 'Water −0.25 L')}>−</button>
          <button type="button" className="rounded-[10px] px-3 py-2 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            onClick={() => save((c) => ({ water_l: r1((c.water_l ?? 0) + 0.25) }), 'Water +0.25 L')}>+0.25</button>
          <button type="button" className="rounded-[10px] px-3 py-2 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            onClick={() => save((c) => ({ water_l: r1((c.water_l ?? 0) + 0.5) }), 'Water +0.5 L')}>+0.5</button>
        </Row>

        {/* Protein */}
        <Row label="Protein" hint={`${Math.round(protein)} / ${nutrition.protein_g} g`}>
          <div className="flex gap-1.5">
            {PROTEIN_CHIPS.map((g) => (
              <button key={g} type="button" onClick={() => logProtein(g)}
                className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}>
                +{g}g
              </button>
            ))}
          </div>
        </Row>

        {/* Creatine */}
        <Row label="Creatine">
          <button type="button" aria-pressed={!!daily?.creatine} onClick={toggleCreatine}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold" style={chip(!!daily?.creatine)}>
            {daily?.creatine ? '✓ Taken' : 'Mark taken'}
          </button>
        </Row>
      </div>
    </Card>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 shrink-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</div>
        {hint && <div className="text-[10px] tabular-nums" style={{ color: 'var(--muted)' }}>{hint}</div>}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}
