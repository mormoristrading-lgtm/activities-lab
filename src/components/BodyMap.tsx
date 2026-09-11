import Model, { type IExerciseData, type IMuscleStats, type Muscle } from 'react-body-highlighter'
import type { Region } from '../lib/muscles'

// react-body-highlighter draws proper anatomical muscle artwork (anterior +
// posterior) and tints each muscle by "frequency" via highlightedColors
// (index = frequency-1). We map our Regions onto its muscle names, bucket each
// Region's 0–10 score into a frequency, and pass a 10-colour ramp.

// One library muscle ← one or more of our Regions (score = max of them).
const LIB_TO_REGIONS: [Muscle, Region[]][] = [
  ['trapezius', ['traps']],
  ['upper-back', ['upperBack', 'lats']],
  ['lower-back', ['lowerBack']],
  ['chest', ['chest']],
  ['biceps', ['biceps']],
  ['triceps', ['triceps']],
  ['forearm', ['forearms']],
  ['front-deltoids', ['shoulders']],
  ['back-deltoids', ['shoulders']],
  ['abs', ['abs']],
  ['obliques', ['abs']],
  ['quadriceps', ['quads']],
  ['hamstring', ['hamstrings']],
  ['calves', ['calves']],
  ['gluteal', ['glutes']],
  ['adductor', ['hipFlexors']],
]

// Reverse map (for click-through to the drill-down).
const REGION_OF_LIB: Partial<Record<Muscle, Region>> = {
  trapezius: 'traps',
  'upper-back': 'lats',
  'lower-back': 'lowerBack',
  chest: 'chest',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearms',
  'front-deltoids': 'shoulders',
  'back-deltoids': 'shoulders',
  abs: 'abs',
  obliques: 'abs',
  quadriceps: 'quads',
  hamstring: 'hamstrings',
  calves: 'calves',
  gluteal: 'glutes',
  adductor: 'hipFlexors',
}

export default function BodyMap({
  scores,
  ramp,
  onSelect,
}: {
  /** 0–10 per region for the active mode */
  scores: Partial<Record<Region, number>>
  /** colour ramp, index 0 = score 1 … index 9 = score 10 */
  ramp: string[]
  onSelect?: (r: Region) => void
}) {
  const data: IExerciseData[] = []
  for (const [lib, regions] of LIB_TO_REGIONS) {
    const score = Math.max(0, ...regions.map((r) => scores[r] ?? 0))
    const freq = Math.round(score)
    if (freq > 0) data.push({ name: lib, muscles: [lib], frequency: freq })
  }

  const handle = (ex: IMuscleStats) => {
    const r = REGION_OF_LIB[ex.muscle]
    if (r && onSelect) onSelect(r)
  }

  const cap = { color: 'var(--muted)' }
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
      <figure className="m-0 w-full max-w-[260px]">
        <Model type="anterior" data={data} highlightedColors={ramp} bodyColor="var(--surface-2)" onClick={handle} style={{ width: '100%' }} />
        <figcaption className="mt-1 text-center text-xs font-medium" style={cap}>Front</figcaption>
      </figure>
      <figure className="m-0 w-full max-w-[260px]">
        <Model type="posterior" data={data} highlightedColors={ramp} bodyColor="var(--surface-2)" onClick={handle} style={{ width: '100%' }} />
        <figcaption className="mt-1 text-center text-xs font-medium" style={cap}>Back</figcaption>
      </figure>
    </div>
  )
}
