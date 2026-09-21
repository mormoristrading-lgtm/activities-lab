import { useState, type ReactElement, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db/db'
import type { RunType } from '../db/types'
import { todayISO } from '../lib/date'
import {
  bodyweightSeries,
  computePRs,
  daysSinceLastMeasurement,
  mileageSeries,
  shortDate,
  volumeSeries,
} from '../lib/progress'
import { computeWeeklyInsights } from '../lib/insights'
import Card from '../components/Card'
import InsightsCard from '../components/InsightsCard'
import Modal from '../components/Modal'
import Screen from '../components/Screen'
import SegmentedControl from '../components/SegmentedControl'
import { Label, NumberField, SelectField } from '../components/Field'
import BodyLog from './progress/BodyLog'
import MonthCalendar from './progress/MonthCalendar'
import Heatmap from './progress/Heatmap'
import Muscles from './progress/Muscles'
import { buildDayIndex } from '../lib/calendar'

const ACCENT = '#B45F38'
const SAGE = '#7C8A5A'
const GOOD = '#5E7A3E'
const GRID = 'rgba(34,31,26,.10)'
const AXIS = '#9A8E78'

const RETEST_DAYS = 28

export default function Progress() {
  const data = useLiveQuery(async () => {
    const daily = await db.dailyLog.toArray()
    const workouts = await db.workoutLogs.toArray()
    const runs = await db.runLogs.toArray()
    const measurements = await db.measurements.toArray()
    const exercises = await db.exercises.toArray()
    const photos = await db.media.where('exerciseId').equals(0).toArray()
    const standardsLog = await db.standardsLog.toArray()
    const weekPlan = await db.weekPlan.toArray()
    const sessions = await db.sessions.toArray()
    const standardsDef = await db.standardsDef.toArray()
    return {
      daily,
      workouts,
      runs,
      measurements,
      exercises,
      photos,
      standardsLog,
      weekPlan,
      sessions,
      standardsDef,
    }
  }, [])

  const [view, setView] = useState<'trends' | 'calendar' | 'heatmap' | 'muscles'>('trends')
  const [weightInput, setWeightInput] = useState<number | null>(null)
  const [runOpen, setRunOpen] = useState(false)

  if (!data) {
    return (
      <Screen eyebrow="Progress" title="Progress">
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </Screen>
    )
  }

  const bw = bodyweightSeries(data.daily)
  const vol = volumeSeries(data.workouts)
  const mileage = mileageSeries(data.runs)
  const prs = computePRs(data.workouts)
  const exById = new Map(data.exercises.map((e) => [e.id!, e]))
  const insights = computeWeeklyInsights({ workouts: data.workouts, daily: data.daily, exercises: data.exercises })

  const sinceMeasure = daysSinceLastMeasurement(data.measurements.map((m) => m.date))
  const retestDue = sinceMeasure == null || sinceMeasure >= RETEST_DAYS

  const prRows = [...prs.values()]
    .map((p) => ({ ...p, name: exById.get(p.exerciseId)?.name ?? `#${p.exerciseId}` }))
    .sort((a, b) => b.bestE1RM - a.bestE1RM)

  const dayIndex = buildDayIndex({
    workouts: data.workouts,
    runs: data.runs,
    standardsLog: data.standardsLog,
    daily: data.daily,
    weekPlan: data.weekPlan,
    sessions: data.sessions,
    standardsDef: data.standardsDef,
  })

  async function logWeight() {
    if (weightInput == null) return
    const today = todayISO()
    await db.transaction('rw', db.dailyLog, async () => {
      const cur = (await db.dailyLog.get(today)) ?? { date: today }
      await db.dailyLog.put({ ...cur, bodyweight_kg: weightInput })
    })
    setWeightInput(null)
  }

  return (
    <Screen eyebrow="Progress" title="Progress">
      <div className="mb-4">
        <SegmentedControl
          segments={[
            { key: 'trends', label: 'Trends' },
            { key: 'muscles', label: 'Muscles' },
            { key: 'calendar', label: 'Calendar' },
            { key: 'heatmap', label: 'Heatmap' },
          ]}
          value={view}
          onChange={setView}
          ariaLabel="Progress view"
        />
      </div>

      {view === 'trends' && (
        <>
      <InsightsCard data={insights} />
      {retestDue && (
        <div className="mb-4 rounded-card border px-4 py-3 text-sm" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--dim)' }}>
          {sinceMeasure == null
            ? 'Log your baseline measurements and a progress photo to start tracking.'
            : `It's been ${sinceMeasure} days since your last measurements — time to re-test (every 4–6 weeks).`}
        </div>
      )}

      {/* Bodyweight */}
      <Card className="p-4">
        <h2 className="text-base font-semibold">Bodyweight</h2>
        <div className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <Label>Log today (kg)</Label>
            <NumberField value={weightInput} step={0.1} onChange={setWeightInput} ariaLabel="Today's bodyweight" />
          </div>
          <button type="button" onClick={logWeight} disabled={weightInput == null} className="rounded-card-sm px-4 py-2 text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            Save
          </button>
        </div>
        <div className="mt-3">
          {bw.length >= 2 ? (
            <ChartBox>
              <LineChart data={bw} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: AXIS }} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: AXIS }} width={40} />
                <Tooltip labelFormatter={(l) => shortDate(String(l))} />
                <Line type="monotone" dataKey="weight" stroke={SAGE} strokeWidth={1} dot={{ r: 2 }} name="Weight" />
                <Line type="monotone" dataKey="avg" stroke={ACCENT} strokeWidth={2.5} dot={false} name="7-day avg" />
              </LineChart>
            </ChartBox>
          ) : (
            <Empty>Log your weight on a few days to see the 7-day average trend.</Empty>
          )}
        </div>
      </Card>

      {/* Training volume */}
      <Card className="mt-4 p-4">
        <h2 className="text-base font-semibold">Training volume</h2>
        {vol.length >= 1 ? (
          <ChartBox>
            <BarChart data={vol} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: AXIS }} />
              <YAxis tick={{ fontSize: 11, fill: AXIS }} width={48} />
              <Tooltip labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [`${v} kg`, 'Volume']} />
              <Bar dataKey="volume" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        ) : (
          <Empty>Log a session to see your tonnage per workout.</Empty>
        )}
      </Card>

      {/* Weekly mileage */}
      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Weekly mileage</h2>
          <button type="button" onClick={() => setRunOpen(true)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            + Add run
          </button>
        </div>
        {mileage.length >= 1 ? (
          <ChartBox>
            <BarChart data={mileage} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="week" tickFormatter={shortDate} tick={{ fontSize: 11, fill: AXIS }} />
              <YAxis tick={{ fontSize: 11, fill: AXIS }} width={40} />
              <Tooltip labelFormatter={(l) => 'Week of ' + shortDate(String(l))} formatter={(v) => [`${v} km`, 'Distance']} />
              <Bar dataKey="km" fill={SAGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        ) : (
          <Empty>Add a run (or sync Strava later) to see weekly mileage.</Empty>
        )}
      </Card>

      {/* PR board */}
      <Card className="mt-4 p-4">
        <h2 className="mb-2 text-base font-semibold">PR board</h2>
        {prRows.length > 0 ? (
          <ul className="space-y-1.5">
            {prRows.map((p) => (
              <li key={p.exerciseId} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text)' }}>{p.name}</span>
                <span className="tabular-nums" style={{ color: 'var(--dim)' }}>
                  <span className="font-semibold" style={{ color: GOOD }}>
                    {p.bestE1RM} kg
                  </span>{' '}
                  <span style={{ color: 'var(--muted)' }}>
                    e1RM · {p.bestWeight}×{p.bestReps}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Log some sets and your best estimated 1RMs will appear here.</Empty>
        )}
      </Card>

      {/* Body log */}
      <div className="mt-4">
        <BodyLog measurements={data.measurements} photos={data.photos} />
      </div>
        </>
      )}

      {view === 'muscles' && <Muscles />}
      {view === 'calendar' && <MonthCalendar lookup={dayIndex} />}
      {view === 'heatmap' && <Heatmap lookup={dayIndex} />}

      {runOpen && <RunForm onClose={() => setRunOpen(false)} />}
    </Screen>
  )
}

function ChartBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2">
      <ResponsiveContainer width="100%" height={190}>
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  )
}

function RunForm({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [type, setType] = useState<RunType>('easy')
  const [km, setKm] = useState<number | null>(null)
  const [min, setMin] = useState<number | null>(null)

  async function save() {
    if (km == null) return
    await db.runLogs.add({
      date,
      type,
      distance_km: km,
      duration_min: min ?? 0,
      notes: '',
      source: 'manual',
    })
    onClose()
  }

  return (
    <Modal
      title="Add run"
      onClose={onClose}
      footer={
        <button type="button" disabled={km == null} onClick={save} className="w-full rounded-card-sm py-2.5 text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
          Add run
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Date</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="w-full rounded-[10px] border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <Label>Type</Label>
          <SelectField
            value={type}
            onChange={(v) => setType(v as RunType)}
            ariaLabel="Run type"
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'interval', label: 'VO2 intervals' },
              { value: 'tempo', label: 'Tempo' },
              { value: 'long', label: 'Long' },
              { value: 'midPace', label: 'Mid pace' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Distance (km)</Label>
            <NumberField value={km} step={0.1} onChange={setKm} ariaLabel="Distance" />
          </div>
          <div>
            <Label>Duration (min)</Label>
            <NumberField value={min} step={1} onChange={setMin} ariaLabel="Duration" />
          </div>
        </div>
      </div>
    </Modal>
  )
}
