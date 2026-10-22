import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { FOOD_GUIDE, type FoodItem } from '../../data/food-guide'
import Card from '../../components/Card'

/** Static cheat-sheet: what to eat to hit each daily target, with a couple of
 * best-quality and budget choices per nutrient — nothing here is logged. */
export default function FoodGuide() {
  const nutrition = useLiveQuery(() => db.nutrition.get('targets'), [])
  if (!nutrition) return null

  const targetLabel: Record<string, string> = {
    protein: `${nutrition.protein_g}g/day`,
    carbs: `${nutrition.carbs_g}g/day`,
    fat: `${nutrition.fat_g}g/day`,
    water: `${nutrition.water_l}L/day`,
    creatine: `${nutrition.creatine_g}g/day`,
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-base font-semibold">Food guide</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          What to eat to hit each target — no weighing or logging needed, just build meals around these.
        </p>
      </Card>

      {FOOD_GUIDE.map((g) => (
        <Card key={g.key} className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              {g.label}
            </h3>
            <span className="shrink-0 text-sm tabular-nums" style={{ color: 'var(--dim)' }}>
              {targetLabel[g.key]}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            {g.why}
          </p>

          <FoodRow title="Best choice" items={g.best} />
          {g.budget.length > 0 && g.budget !== g.best && <FoodRow title="Budget choice" items={g.budget} />}
        </Card>
      ))}
    </div>
  )
}

function FoodRow({ title, items }: { title: string; items: FoodItem[] }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
        {title}
      </p>
      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.name}
            className="flex items-center gap-2.5 rounded-card-sm border p-2"
            style={{ borderColor: 'var(--line)' }}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg"
              style={{ background: 'var(--surface-2)' }}
              aria-hidden
            >
              {it.emoji}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {it.name}
              </div>
              <div className="text-[11px] leading-snug" style={{ color: 'var(--muted)' }}>
                {it.note}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
