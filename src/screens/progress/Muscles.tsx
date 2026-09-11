import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { StrengthEntry } from '../../db/types'
import { toISO } from '../../lib/date'
import {
  type MuscleVolume,
  type Region,
  REGION_LABEL,
  balanceRatios,
  computeStrength,
  coverageScore,
  loggedMuscleVolume,
  normalizeMuscle,
  volumeByRegion,
  weeklyMuscleVolume,
} from '../../lib/muscles'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import SegmentedControl from '../../components/SegmentedControl'
import BodyMap from '../../components/BodyMap'

// ── colour ramps ─────────────────────────────────────────────────────────────
/** Volume → theme-aware accent tint (more sets = more opaque). */
function volumeColor(score: number): string {
  const pct = Math.round(8 + 82 * (Math.max(0, Math.min(10, score)) / 10))
  return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)
const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`

/** Strength → red (weak) → amber → green (strong). */
function strengthColor(score: number): string {
  const t = Math.max(0, Math.min(1, score / 10))
  const stops = [
    [192, 57, 43],
    [217, 164, 65],
    [94, 122, 62],
  ]
  const seg = t < 0.5 ? 0 : 1
  const lt = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5
  const a = stops[seg]
  const b = stops[seg + 1]
  return hex(lerp(a[0], b[0], lt), lerp(a[1], b[1], lt), lerp(a[2], b[2], lt))
}

/** Interpolate a multi-stop RGB ramp into `n` hex colours (index 0 = lowest). */
function buildRamp(stops: number[][], n = 10): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1)
    const seg = t * (stops.length - 1)
    const k = Math.min(stops.length - 2, Math.floor(seg))
    const lt = seg - k
    const a = stops[k]
    const b = stops[k + 1]
    out.push(hex(lerp(a[0], b[0], lt), lerp(a[1], b[1], lt), lerp(a[2], b[2], lt)))
  }
  return out
}
const VOLUME_RAMP = buildRamp([[226, 214, 197], [193, 95, 56], [150, 58, 26]])
const STRENGTH_RAMP = buildRamp([[192, 57, 43], [217, 164, 65], [94, 122, 62]])

const r1 = (n: number) => Math.round(n * 10) / 10

export default function Muscles() {
  const data = useLiveQuery(async () => {
    const [exercises, sessions, weekPlan, workouts, settings, daily] = await Promise.all([
      db.exercises.toArray(),
      db.sessions.toArray(),
      db.weekPlan.toArray(),
      db.workoutLogs.toArray(),
      db.settings.toArray(),
      db.dailyLog.toArray(),
    ])
    return { exercises, sessions, weekPlan, workouts, settings, daily }
  }, [])

  const [mode, setMode] = useState<'volume' | 'strength'>('volume')
  const [source, setSource] = useState<'planned' | 'completed'>('planned')
  const [sel, setSel] = useState<Region | null>(null)

  if (!data) return <p style={{ color: 'var(--muted)' }}>Loading…</p>

  const { exercises, sessions, weekPlan, workouts, settings, daily } = data

  const since = toISO(new Date(Date.now() - 7 * 86_400_000))
  const vols =
    source === 'planned'
      ? weeklyMuscleVolume(weekPlan, sessions, exercises)
      : loggedMuscleVolume(workouts, exercises, since)
  const volMap = volumeByRegion(vols)
  const ratios = balanceRatios(vols)
  const coverage = coverageScore(vols)

  const bodyweight =
    [...daily]
      .filter((d) => d.bodyweight_kg != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1)?.bodyweight_kg ?? null
  const report = (settings.find((s) => s.key === 'strengthReport')?.value as StrengthEntry[]) ?? []
  const strength = computeStrength(report, exercises, bodyweight)

  const scores: Partial<Record<Region, number>> = {}
  if (mode === 'volume') {
    for (const v of vols) scores[v.region] = v.score
  } else {
    for (const region of Object.keys(strength.byRegion) as Region[])
      scores[region] = strength.byRegion[region]!
  }
  const ramp = mode === 'volume' ? VOLUME_RAMP : STRENGTH_RAMP

  const mostTrained = vols[0] ?? null
  const mostNeglected = vols.length ? vols[vols.length - 1] : null

  return (
    <div className="space-y-4">
      <SegmentedControl
        ariaLabel="Muscle map mode"
        segments={[
          { key: 'volume', label: 'Volume' },
          { key: 'strength', label: 'Strength' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'volume' && (
        <SegmentedControl
          ariaLabel="Volume source"
          segments={[
            { key: 'planned', label: 'Planned' },
            { key: 'completed', label: 'Completed · 7d' },
          ]}
          value={source}
          onChange={setSource}
        />
      )}

      {/* Body map */}
      <Card className="p-4">
        <BodyMap scores={scores} ramp={ramp} onSelect={setSel} />
        {mode === 'volume' ? (
          <Legend
            from={ramp[0]}
            to={ramp[9]}
            left="Light"
            right="High volume"
            caption={
              source === 'planned'
                ? 'Weekly sets from your program · tap a muscle for detail'
                : 'Sets you actually logged in the last 7 days · tap a muscle'
            }
          />
        ) : (
          <Legend
            from={ramp[0]}
            to={ramp[9]}
            left="Weak"
            right="Strong"
            caption={
              strength.used === 0
                ? 'Add benchmark lifts in Lab → Strength Report to fill this in'
                : strength.mode === 'absolute'
                  ? 'Strength vs bodyweight standards · tap a muscle'
                  : 'Relative balance (log your bodyweight for absolute levels)'
            }
          />
        )}
      </Card>

      {/* Callouts */}
      {mode === 'volume' ? (
        <Card className="p-4">
          <Row label="Program coverage" value={`${coverage} / 10`} />
          {mostTrained && (
            <Row label="Most trained" value={`${REGION_LABEL[mostTrained.region]} · ${mostTrained.effectiveSets} sets`} />
          )}
          {mostNeglected && mostNeglected.region !== mostTrained?.region && (
            <Row label="Most neglected" value={`${REGION_LABEL[mostNeglected.region]} · ${mostNeglected.effectiveSets} sets`} />
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Ratio label="Push : Pull" value={ratios.pushPull} />
            <Ratio label="Quad : Ham" value={ratios.quadHam} />
            <Ratio label="Ant : Post" value={ratios.antPost} />
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          {strength.used === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No benchmark lifts yet. Open <span style={{ color: 'var(--text)' }}>Lab → Strength Report</span> and enter a
              few (e.g. Back Squat, Bench, Pull-up) to see strongest and weakest muscles.
            </p>
          ) : (
            <>
              {strength.strongest && (
                <Row label="Strongest" value={REGION_LABEL[strength.strongest]} valueColor={strengthColor(10)} />
              )}
              {strength.weakest && (
                <Row label="Weakest" value={REGION_LABEL[strength.weakest]} valueColor={strengthColor(0)} />
              )}
              {!bodyweight && (
                <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                  Log your bodyweight (Progress → Bodyweight) for absolute strength levels — showing relative balance for now.
                </p>
              )}
            </>
          )}
        </Card>
      )}

      {/* Ranked list */}
      <Card className="p-4">
        <p className="mb-2 text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
          {mode === 'volume' ? 'Weekly volume by muscle' : 'Strength by muscle'}
        </p>
        <div className="space-y-2">
          {mode === 'volume'
            ? vols.map((v) => (
                <BarRow
                  key={v.region}
                  label={REGION_LABEL[v.region]}
                  score={v.score}
                  right={`${v.effectiveSets} sets · ${v.score}/10`}
                  color={volumeColor(Math.max(2, v.score))}
                  onClick={() => setSel(v.region)}
                />
              ))
            : strength.used === 0
              ? <p className="text-sm" style={{ color: 'var(--muted)' }}>—</p>
              : strength.muscles.map((m) => (
                  <BarRow
                    key={m.region}
                    label={REGION_LABEL[m.region]}
                    score={m.score}
                    right={`${r1(m.score)}/10${m.lagging ? ' · lagging' : ''}`}
                    color={strengthColor(m.score)}
                    flag={m.lagging}
                    onClick={() => setSel(m.region)}
                  />
                ))}
        </div>
      </Card>

      {sel && (
        <MuscleDetail
          region={sel}
          onClose={() => setSel(null)}
          volume={volMap[sel] ?? null}
          strengthScore={strength.byRegion[sel] ?? null}
          strengthMode={strength.mode}
          exercises={regionExercises(sel, weekPlan, sessions, exercises)}
        />
      )}
    </div>
  )
}

// ── small UI helpers ─────────────────────────────────────────────────────────
function Legend({
  from,
  to,
  left,
  right,
  caption,
}: {
  from: string
  to: string
  left: string
  right: string
  caption: string
}) {
  return (
    <div className="mt-3">
      <div className="h-2 w-full rounded-full" style={{ background: `linear-gradient(to right, ${from}, ${to})` }} />
      <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <p className="mt-2 text-center text-xs" style={{ color: 'var(--muted)' }}>
        {caption}
      </p>
    </div>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm" style={{ color: 'var(--dim)' }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: valueColor ?? 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

function Ratio({ label, value }: { label: string; value: number }) {
  const txt = !isFinite(value) ? '∞ : 1' : value === 0 ? '—' : `${value} : 1`
  return (
    <div className="rounded-card-sm border p-2" style={{ borderColor: 'var(--line)' }}>
      <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
        {txt}
      </div>
      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
    </div>
  )
}

function BarRow({
  label,
  score,
  right,
  color,
  flag,
  onClick,
}: {
  label: string
  score: number
  right: string
  color: string
  flag?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--text)' }}>
          {label}
          {flag && <span className="ml-1" style={{ color: strengthColor(0) }}>▾</span>}
        </span>
        <span className="tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
          {right}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full" style={{ background: 'var(--surface-2)' }}>
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${Math.max(4, (score / 10) * 100)}%`, background: color }}
        />
      </div>
    </button>
  )
}

// ── drill-down ───────────────────────────────────────────────────────────────
interface RegionExercise {
  name: string
  sets: number
  role: 'primary' | 'secondary'
}

function regionExercises(
  region: Region,
  weekPlan: { am: { sessionKey?: string | null }[]; pm: { sessionKey?: string | null }[] }[],
  sessions: { key: string; items: { exerciseId: number; sets: number }[] }[],
  exercises: { id?: number; name: string; primaryMuscles?: string[]; secondaryMuscles?: string[] }[],
): RegionExercise[] {
  const exById = new Map(exercises.map((e) => [e.id!, e]))
  const sByKey = new Map(sessions.map((s) => [s.key, s]))
  const acc = new Map<number, RegionExercise>()
  for (const day of weekPlan) {
    for (const slot of [...day.am, ...day.pm]) {
      if (!slot.sessionKey) continue
      const sess = sByKey.get(slot.sessionKey)
      if (!sess) continue
      for (const it of sess.items) {
        const ex = exById.get(it.exerciseId)
        if (!ex) continue
        const prim = (ex.primaryMuscles ?? []).some((m) => normalizeMuscle(m) === region)
        const sec = (ex.secondaryMuscles ?? []).some((m) => normalizeMuscle(m) === region)
        if (!prim && !sec) continue
        const cur = acc.get(it.exerciseId) ?? { name: ex.name, sets: 0, role: prim ? 'primary' : 'secondary' }
        cur.sets += it.sets
        if (prim) cur.role = 'primary'
        acc.set(it.exerciseId, cur)
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.sets - a.sets)
}

function MuscleDetail({
  region,
  onClose,
  volume,
  strengthScore,
  strengthMode,
  exercises,
}: {
  region: Region
  onClose: () => void
  volume: MuscleVolume | null
  strengthScore: number | null
  strengthMode: 'absolute' | 'relative'
  exercises: RegionExercise[]
}) {
  return (
    <Modal title={REGION_LABEL[region]} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Weekly volume" value={volume ? `${volume.effectiveSets} sets` : '—'} sub={volume ? `${volume.score}/10` : 'not trained'} />
          <Stat
            label="Strength"
            value={strengthScore != null ? `${r1(strengthScore)}/10` : '—'}
            sub={strengthScore != null ? (strengthMode === 'absolute' ? 'vs standards' : 'relative') : 'no benchmark'}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--dim)' }}>
            Exercises hitting it
          </p>
          {exercises.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nothing in your current program trains this directly.
            </p>
          ) : (
            <ul className="space-y-1">
              {exercises.map((e, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text)' }}>
                    {e.name}
                    <span className="ml-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                      {e.role}
                    </span>
                  </span>
                  <span className="tabular-nums text-xs" style={{ color: 'var(--muted)' }}>
                    {e.sets} sets/wk
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-card-sm border p-3" style={{ borderColor: 'var(--line)' }}>
      <div className="text-[11px]" style={{ color: 'var(--dim)' }}>
        {label}
      </div>
      <div className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
        {sub}
      </div>
    </div>
  )
}
