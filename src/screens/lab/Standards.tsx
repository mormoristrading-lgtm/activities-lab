import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { todayISO } from '../../lib/date'
import { computeStreaks } from '../../lib/standards'
import Card from '../../components/Card'

export default function Standards() {
  const data = useLiveQuery(async () => {
    const defs = await db.standardsDef.orderBy('order').toArray()
    const logs = await db.standardsLog.toArray()
    return { defs, logs }
  }, [])

  if (!data) return null
  const today = todayISO()
  const ids = data.defs.map((d) => d.id!)
  const streaks = computeStreaks(ids, data.logs, today)

  async function toggle(id: number) {
    await db.transaction('rw', db.standardsLog, async () => {
      const cur = (await db.standardsLog.get(today)) ?? { date: today, done: {} }
      await db.standardsLog.put({ date: today, done: { ...cur.done, [id]: !cur.done[id] } })
    })
  }

  const completedToday = ids.filter((id) => streaks.get(id)?.doneToday).length

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Daily standards</h2>
        <span className="text-xs tabular-nums" style={{ color: 'var(--dim)' }}>
          {completedToday}/{ids.length} today
        </span>
      </div>
      <ul className="space-y-1">
        {data.defs.map((s) => {
          const info = streaks.get(s.id!)
          const done = info?.doneToday ?? false
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id!)}
                aria-pressed={done}
                className="flex w-full items-center gap-3 rounded-card-sm px-2 py-2 text-left"
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs"
                  style={{
                    borderColor: done ? 'var(--good)' : 'var(--line)',
                    background: done ? 'var(--good)' : 'transparent',
                    color: done ? 'var(--on-accent)' : 'transparent',
                  }}
                >
                  ✓
                </span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>
                  {s.label}
                </span>
                {info && info.streak > 0 && (
                  <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                    🔥 {info.streak}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
