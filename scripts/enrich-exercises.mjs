// One-time data prep for the exercise Library + program enrichment.
//   1. Downloads the public-domain free-exercise-db dataset -> src/data/exercises.json
//      (the full ~873-record Library, bundled for offline browsing).
//   2. Matches each program movement to a dataset record (alias map first, then a
//      normalized fuzzy fallback), downloads its first image into
//      public/exercise-images/, and writes src/data/program-images.json
//      (program slug -> local image path) so program images work offline.
// Re-run with: npm run enrich
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src', 'data')
const imgDir = join(root, 'public', 'exercise-images')
mkdirSync(dataDir, { recursive: true })
mkdirSync(imgDir, { recursive: true })

const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main'
const DATASET_URL = `${RAW}/dist/exercises.json`
const imageUrl = (rel) => `${RAW}/exercises/${rel}`

// Program movements that exist in the dataset (skill/calisthenic moves like
// handstand, weighted dip, weighted pistol, muscle-up are intentionally absent).
const PROGRAM = [
  { slug: 'back-squat', q: 'Back Squat', alias: 'Barbell_Squat' },
  { slug: 'romanian-deadlift', q: 'Romanian Deadlift', alias: 'Romanian_Deadlift' },
  { slug: 'bulgarian-split-squat', q: 'Bulgarian Split Squat', alias: 'Bulgarian_Split_Squat' },
  { slug: 'hanging-leg-raise', q: 'Hanging Leg Raise', alias: 'Hanging_Leg_Raise' },
  { slug: 'standing-calf-raise', q: 'Standing Calf Raise', alias: 'Standing_Calf_Raises' },
  { slug: 'bench-press', q: 'Bench Press', alias: 'Barbell_Bench_Press_-_Medium_Grip' },
  { slug: 'overhead-press', q: 'Overhead Press', alias: 'Standing_Military_Press' },
  { slug: 'incline-db-press', q: 'Incline Dumbbell Press', alias: 'Incline_Dumbbell_Press' },
  { slug: 'lateral-raise', q: 'Side Lateral Raise', alias: 'Side_Lateral_Raise' },
  { slug: 'triceps-pushdown', q: 'Triceps Pushdown', alias: 'Triceps_Pushdown' },
  { slug: 'front-squat', q: 'Front Squat', alias: 'Front_Barbell_Squat' },
  { slug: 'hip-thrust', q: 'Barbell Hip Thrust', alias: 'Barbell_Hip_Thrust' },
  { slug: 'walking-lunge', q: 'Dumbbell Lunges', alias: 'Dumbbell_Lunges' },
  { slug: 'leg-curl', q: 'Lying Leg Curls', alias: 'Lying_Leg_Curls' },
  { slug: 'seated-calf-raise', q: 'Seated Calf Raise', alias: 'Seated_Calf_Raise' },
  { slug: 'weighted-pull-up', q: 'Pullups', alias: 'Pullups' },
  { slug: 'barbell-row', q: 'Bent Over Barbell Row', alias: 'Bent_Over_Barbell_Row' },
  { slug: 'chin-up', q: 'Chin-Up', alias: 'Chin-Up' },
  { slug: 'lat-pulldown', q: 'Wide-Grip Lat Pulldown', alias: 'Wide-Grip_Lat_Pulldown' },
  { slug: 'face-pull', q: 'Face Pull', alias: 'Face_Pull' },
  { slug: 'biceps-curl', q: 'Barbell Curl', alias: 'Barbell_Curl' },
]

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[-–—/_]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const tokens = (s) => new Set(norm(s).split(' ').filter(Boolean))

function jaccard(a, b) {
  const A = tokens(a)
  const B = tokens(b)
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  const union = A.size + B.size - inter
  return union ? inter / union : 0
}

async function main() {
  console.log('Downloading dataset…')
  const res = await fetch(DATASET_URL)
  if (!res.ok) throw new Error(`dataset fetch ${res.status}`)
  const all = await res.json()
  console.log(`  ${all.length} exercises`)

  // Trim to the fields the Library actually uses (keeps the bundle smaller).
  const slimmed = all.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    equipment: e.equipment,
    primaryMuscles: e.primaryMuscles ?? [],
    secondaryMuscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
    images: e.images ?? [],
  }))
  writeFileSync(join(dataDir, 'exercises.json'), JSON.stringify(slimmed))
  console.log(`  wrote src/data/exercises.json (${(JSON.stringify(slimmed).length / 1024) | 0} KiB)`)

  const byId = new Map(all.map((e) => [e.id, e]))
  const programImages = {}
  let matched = 0

  for (const p of PROGRAM) {
    let rec = p.alias && byId.get(p.alias)
    let how = 'alias'
    if (!rec) {
      // fuzzy fallback: highest token-overlap
      let best = null
      let bestScore = 0
      for (const e of all) {
        const s = jaccard(p.q, e.name)
        if (s > bestScore) {
          bestScore = s
          best = e
        }
      }
      if (best && bestScore >= 0.34) {
        rec = best
        how = `fuzzy(${bestScore.toFixed(2)})`
      }
    }

    if (!rec || !rec.images?.length) {
      console.log(`  ✗ ${p.slug.padEnd(22)} no match`)
      continue
    }

    const rel = rec.images[0]
    const url = imageUrl(rel)
    try {
      const ir = await fetch(url)
      if (!ir.ok) throw new Error(`img ${ir.status}`)
      const buf = Buffer.from(await ir.arrayBuffer())
      const file = `${rec.id}.jpg`
      writeFileSync(join(imgDir, file), buf)
      programImages[p.slug] = `/exercise-images/${file}`
      matched++
      console.log(`  ✓ ${p.slug.padEnd(22)} -> ${rec.id}  [${how}]`)
    } catch (err) {
      console.log(`  ! ${p.slug.padEnd(22)} ${rec.id} image failed: ${err.message}`)
    }
  }

  writeFileSync(join(dataDir, 'program-images.json'), JSON.stringify(programImages, null, 2))
  console.log(`\nMatched ${matched}/${PROGRAM.length} program images.`)
  console.log('Wrote src/data/program-images.json')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
