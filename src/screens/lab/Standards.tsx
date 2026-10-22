import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { todayISO } from '../../lib/date'
import { computeStreaks } from '../../lib/standards'
import { buzz } from '../../lib/haptics'
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
    buzz()
    await db.transaction('rw', db.standardsLog, async () => {
      const cur = (await db.standardsLog.get(today)) ?? { date: today, done: {} }
      await db.standardsLog.put({ date: today, done: { ...cur.done, [id]: !cur.done[id] } })
    })
  }

  const completedToday = ids.filter((id) => streaks.get(id)?.doneToday).length
  const allDone = ids.length > 0 && completedToday === ids.length

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-semibold">{allDone ? 'All done today ✓' : 'Today’s checklist'}</h2>
        <span className="text-xs font-medium tabular-nums" style={{ color: allDone ? 'var(--good)' : 'var(--dim)' }}>
          {completedToday}/{ids.length}
        </span>
      </div>
      <div className="mb-2 h-1 rounded-full" style={{ background: 'var(--track)' }}>
        <div
          className="h-1 rounded-full"
          style={{
            width: `${ids.length ? (completedToday / ids.length) * 100 : 0}%`,
            background: 'var(--good)',
            transition: 'width .3s',
          }}
        />
      </div>
      <ul>
        {data.defs.map((s) => {
          const info = streaks.get(s.id!)
          const done = info?.doneToday ?? false
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id!)}
                aria-pressed={done}
                className="flex w-full items-center gap-3 rounded-card-sm px-1 py-3 text-left transition-opacity active:opacity-60"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm transition-colors"
                  style={{
                    borderColor: done ? 'var(--good)' : 'var(--line)',
                    background: done ? 'var(--good)' : 'transparent',
                    color: done ? 'var(--on-accent)' : 'transparent',
                  }}
                >
                  ✓
                </span>
                <span
                  className="flex-1 text-[15px]"
                  style={{ color: done ? 'var(--muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}
                >
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
