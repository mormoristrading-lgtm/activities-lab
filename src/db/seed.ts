import type { AppDB } from './db'
import type {
  Exercise,
  Session,
  WeekPlanDay,
  Run,
  Metcon,
  Nutrition,
  MealPreset,
  Guidance,
  Goal,
  StandardDef,
  Reminder,
  Motivation,
  Setting,
} from './types'
import programImagesJson from '../data/program-images.json'

const programImages = programImagesJson as Record<string, string>
// program-images.json paths are root-absolute ("/exercise-images/…"); rebase them
// onto the app's actual base path so they still resolve under a subpath deploy
// (e.g. GitHub Pages' /activities-lab/) as well as a root deploy.
const img = (slug: string) => {
  const path = programImages[slug]
  return path ? import.meta.env.BASE_URL + path.replace(/^\//, '') : ''
}

// ── Program exercises (explicit ids so sessions can reference them) ───────────
// 5-day gym program: Upper · Lower · Push · Pull · Legs. Ids 1–37 reuse the
// original slugs where the movement is unchanged so prior lift history stays
// linked; ids 39+ are the movements this program adds.
export const EXERCISES: Exercise[] = [
  // ── Legs / Lower ──────────────────────────────────────────────────────────
  ex(1, 'back-squat', 'Barbell Back Squat', 'lower', ['quadriceps', 'glutes'], ['hamstrings', 'lower back'], [
    'Brace hard before you unrack.',
    'Sit between the hips; knees track over the toes.',
    'Drive the floor away out of the hole.',
  ]),
  ex(2, 'romanian-deadlift', 'Romanian Deadlift', 'lower', ['hamstrings', 'glutes'], ['lower back'], [
    'Soft knees, hinge from the hips; bar stays close.',
    'Feel the hamstring stretch; stop before the lower back rounds.',
  ]),
  ex(43, 'leg-press', 'Leg Press', 'lower', ['quadriceps', 'glutes'], ['hamstrings'], [
    'Feet mid-platform; knees track over the toes.',
    'Control the descent; don’t let the lower back round at the bottom.',
  ]),
  ex(44, 'seated-leg-curl', 'Seated Leg Curl', 'accessory', ['hamstrings'], ['calves'], [
    'Squeeze the hamstrings; slow on the way back.',
  ]),
  ex(15, 'walking-lunge', 'Walking Lunge', 'lower', ['quadriceps', 'glutes'], ['hamstrings'], [
    'Long stride; the front knee tracks the toe.',
  ]),
  ex(5, 'standing-calf-raise', 'Standing Calf Raise', 'accessory', ['calves'], [], [
    'Full stretch at the bottom, pause at the top.',
  ]),
  ex(13, 'front-squat', 'Hack Squat / Front Squat', 'lower', ['quadriceps'], ['glutes', 'abdominals'], [
    'Hack squat (machine) or front squat — stay upright, full depth.',
    'Quads do the work; keep the heels planted.',
  ]),
  ex(14, 'hip-thrust', 'Hip Thrust', 'lower', ['glutes', 'hamstrings'], ['quadriceps'], [
    'Chin tucked, ribs down; full hip lockout and squeeze.',
  ]),
  ex(62, '45-back-extension', '45° Back Extension', 'lower', ['glutes', 'hamstrings'], ['lower back'], [
    'Round the upper back slightly and squeeze the glutes at the top — don’t hyperextend the spine.',
    'Hold a plate to the chest once bodyweight reps get easy.',
  ]),
  ex(28, 'reverse-lunge', 'Barbell Reverse Lunge', 'lower', ['quadriceps', 'glutes'], ['hamstrings'], [
    'Step back, drop the rear knee, drive through the front heel.',
    'Load it heavy — easier on the knees than walking lunges.',
  ]),
  ex(60, 'leg-extension', 'Leg Extension', 'accessory', ['quadriceps'], [], [
    'Pause and squeeze at full lockout; control the eccentric.',
  ]),
  ex(45, 'lying-leg-curl', 'Lying Leg Curl', 'accessory', ['hamstrings'], ['calves'], [
    'Hips pinned to the pad; slow eccentric.',
  ]),
  ex(18, 'seated-calf-raise', 'Seated Calf Raise', 'accessory', ['calves'], [], [
    'Higher reps; full range with a brief pause (soleus focus).',
  ]),

  // ── Chest / Push ──────────────────────────────────────────────────────────
  ex(49, 'incline-barbell-press', 'Incline Barbell Press', 'upperPush', ['chest', 'shoulders'], ['triceps'], [
    'Low incline (~30°); bar to the upper chest.',
    'Shoulder blades pinned; drive to lockout.',
  ]),
  ex(39, 'flat-db-press', 'Flat DB Press', 'upperPush', ['chest', 'triceps'], ['shoulders'], [
    'Control the stretch at the bottom; press the dumbbells together at the top.',
  ]),
  ex(7, 'bench-press', 'Flat Barbell Bench Press', 'upperPush', ['chest', 'triceps'], ['shoulders'], [
    'Shoulder blades pinned, slight arch.',
    'Bar to the lower chest, drive to lockout.',
  ]),
  ex(10, 'incline-db-press', 'Incline DB Press', 'upperPush', ['chest', 'shoulders'], ['triceps'], [
    'Low incline; control the stretch.',
  ]),
  ex(46, 'cable-fly', 'Cable Fly / Pec Deck', 'accessory', ['chest'], ['shoulders'], [
    'Slight elbow bend held constant; squeeze the chest, big stretch.',
  ]),

  // ── Shoulders ─────────────────────────────────────────────────────────────
  ex(30, 'seated-db-shoulder-press', 'Seated DB Shoulder Press', 'upperPush', ['shoulders'], ['triceps'], [
    'Back supported, ribs down; press to lockout without flaring.',
  ]),
  ex(47, 'machine-shoulder-press', 'Machine Shoulder Press', 'upperPush', ['shoulders'], ['triceps'], [
    'Seat set so the handles sit at shoulder height; full lockout.',
  ]),
  ex(11, 'lateral-raise', 'Lateral Raise', 'accessory', ['shoulders'], [], [
    'Lead with the elbows; no swinging. Light and high-rep.',
  ]),
  ex(41, 'reverse-pec-deck', 'Reverse Pec Deck', 'accessory', ['shoulders'], ['traps', 'middle back'], [
    'Rear-delt focus — arms wide, squeeze the shoulder blades.',
  ]),
  ex(23, 'face-pull', 'Face Pull', 'accessory', ['shoulders', 'traps'], [], [
    'Pull to the forehead and externally rotate; rear delts + upper back.',
  ]),
  ex(55, 'rear-delt-fly', 'Rear Delt Fly', 'accessory', ['shoulders'], ['traps', 'middle back'], [
    'Bent over or on a chest-supported bench; lead with the pinkies.',
  ]),
  ex(77, 'cuban-press', 'Cuban Press', 'accessory', ['shoulders'], ['traps', 'biceps'], [
    'Rehab-style swap for overhead/shoulder press — light weight, rotator-cuff focused, not a pressing movement.',
    'Upright row to elbow height → rotate forearms up to 90° (external rotation) → press overhead lightly → reverse the sequence back down.',
    'Keep the load light; stop the set if the joint pinches.',
  ]),

  // ── Triceps ───────────────────────────────────────────────────────────────
  ex(12, 'triceps-pushdown', 'Triceps Pushdown', 'accessory', ['triceps'], [], [
    'Full lockout; keep the elbows pinned to the sides.',
  ]),
  ex(42, 'overhead-triceps-extension', 'Overhead Cable Triceps Extension', 'accessory', ['triceps'], [], [
    'Rope or straight-bar attachment, face away from the stack; elbows by the ears.',
    'Deep stretch overhead, full lockout (long head).',
  ]),
  ex(48, 'triceps-dips', 'Triceps Dips', 'upperPush', ['triceps', 'chest'], ['shoulders'], [
    'Stay upright for triceps; control the descent. Add load when easy.',
  ]),
  ex(32, 'skull-crushers', 'Skullcrusher', 'accessory', ['triceps'], [], [
    'Elbows stay put; lower to the forehead, no flare.',
  ]),

  // ── Back / Pull ───────────────────────────────────────────────────────────
  ex(54, 'deadlift', 'Deadlift', 'upperPull', ['lower back', 'glutes', 'hamstrings'], ['lats', 'traps'], [
    'Brace, bar over mid-foot; push the floor away and lock the hips.',
    'Or rack pulls if pulling from the floor bothers the back.',
  ]),
  ex(40, 't-bar-row', 'T-Bar Row', 'upperPull', ['middle back', 'lats'], ['biceps'], [
    'Hinge ~45°; pull to the lower ribs, squeeze the shoulder blades.',
  ]),
  ex(22, 'lat-pulldown', 'Lat Pulldown', 'upperPull', ['lats', 'biceps'], ['middle back'], [
    'Drive the elbows down and back; full stretch at the top.',
  ]),
  ex(50, 'wide-lat-pulldown', 'Wide Lat Pulldown', 'upperPull', ['lats'], ['biceps', 'middle back'], [
    'Wide grip; pull to the upper chest — lat width focus.',
  ]),
  ex(51, 'close-grip-lat-pulldown', 'Close-Grip Lat Pulldown', 'upperPull', ['lats', 'biceps'], ['middle back'], [
    'Close/neutral grip; drive the elbows down for lower-lat thickness.',
  ]),
  ex(52, 'seated-cable-row', 'Seated Cable Row', 'upperPull', ['middle back', 'lats'], ['biceps'], [
    'Tall chest; row to the stomach, squeeze, control the return.',
  ]),
  ex(53, 'single-arm-db-row', 'Single-Arm DB Row', 'upperPull', ['lats', 'middle back'], ['biceps'], [
    'Brace on the bench; row to the hip, full stretch at the bottom.',
  ]),
  ex(61, 'single-arm-chest-supported-row', 'Single-Arm Chest-Supported Row', 'upperPull', ['lats', 'middle back'], ['biceps'], [
    'Chest pinned to the pad — no momentum from the lower back.',
    'Row one arm at a time, squeeze the shoulder blade at the top.',
  ]),

  // ── Biceps ────────────────────────────────────────────────────────────────
  ex(37, 'ez-bar-curl', 'EZ-Bar Curl', 'accessory', ['biceps'], ['forearms'], [
    'Angled grip is easier on the wrists; keep the elbows pinned.',
  ]),
  ex(24, 'biceps-curl', 'Barbell Curl', 'accessory', ['biceps'], ['forearms'], [
    'No swing; squeeze at the top, full stretch at the bottom.',
  ]),
  ex(36, 'incline-db-curl', 'Incline DB Curl', 'accessory', ['biceps'], ['forearms'], [
    'Lying back on an incline stretches the long head; full supination.',
  ]),
  ex(56, 'hammer-curl', 'Hammer Curl', 'accessory', ['biceps', 'forearms'], [], [
    'Neutral grip; controlled — hits the brachialis and forearm.',
  ]),
  ex(57, 'preacher-curl', 'Preacher / Cable Curl', 'accessory', ['biceps'], ['forearms'], [
    'Upper arm on the pad; no bounce out of the bottom.',
  ]),

  // ── Forearms ──────────────────────────────────────────────────────────────
  ex(78, 'wrist-curl', 'Barbell Wrist Curl', 'accessory', ['forearms'], [], [
    'Forearms on the bench/thighs, wrists just off the edge; curl up through full wrist flexion.',
    'Small muscle, light load — slow and controlled, no bouncing.',
  ]),
  ex(79, 'reverse-curl', 'Reverse Curl', 'accessory', ['forearms', 'biceps'], [], [
    'Overhand (pronated) grip on an EZ-bar/barbell; curl without swinging.',
    'Keep it light and strict — builds forearm size and the brachialis under the biceps.',
  ]),

  // ── Core ──────────────────────────────────────────────────────────────────
  ex(4, 'hanging-leg-raise', 'Hanging Leg Raise', 'accessory', ['abdominals'], ['hip flexors'], [
    'Dead hang, posterior pelvic tilt; raise with the abs, not momentum.',
    'Add ankle weight to keep progressing.',
  ]),
  ex(58, 'decline-sit-up', 'Weighted Decline Sit-Up', 'accessory', ['abdominals'], ['hip flexors'], [
    'Hold a plate at the chest; control the descent, full contraction.',
  ]),
  ex(59, 'captains-chair-leg-raise', "Captain's Chair Leg Raise", 'accessory', ['abdominals'], ['hip flexors'], [
    'Back supported; raise the knees/legs with the abs, no swing.',
  ]),
  ex(29, 'ab-wheel', 'Ab Wheel / Pallof Press', 'accessory', ['abdominals'], ['lower back'], [
    'Brace hard; roll out only as far as you can keep a neutral spine.',
    'Pallof press alternative: resist rotation, arms straight out.',
  ]),

  // ── 4-Day program additions ────────────────────────────────────────────────
  ex(63, 'plate-loaded-row-machine', 'Plate-Loaded Row Machine', 'upperPull', ['middle back', 'lats'], ['biceps'], [
    'Chest against the pad; pull the handles to the ribs, squeeze the shoulder blades.',
  ]),
  ex(64, 'plate-loaded-chest-press', 'Plate-Loaded Chest Press', 'upperPush', ['chest', 'triceps'], ['shoulders'], [
    'Handles at mid-chest height; press to lockout without shrugging.',
  ]),
  ex(65, 'pullup-neutral-grip', 'Pull-Up (or Neutral-Grip Lat Pulldown)', 'upperPull', ['lats'], ['biceps', 'middle back'], [
    'Full dead hang to chin over the bar; substitute neutral-grip lat pulldown if unavailable.',
  ]),
  ex(66, 'machine-high-row', 'Machine High Row', 'upperPull', ['middle back', 'lats'], ['biceps'], [
    'High-elbow row; drive the elbows back and squeeze the upper back.',
  ]),
  ex(67, 'bulgarian-split-squat', 'Bulgarian Split Squat', 'lower', ['quadriceps', 'glutes'], ['hamstrings'], [
    'Rear foot elevated; drop straight down, front knee tracks the toe.',
  ]),

  // ── Calisthenics & Run session ─────────────────────────────────────────────
  ex(68, 'pushup-close-grip', 'Close-Grip Push-Up', 'upperPush', ['triceps', 'chest'], ['shoulders'], [
    'Hands close together under the chest; elbows stay tucked to the sides.',
  ]),
  ex(69, 'pushup-normal', 'Push-Up', 'upperPush', ['chest', 'triceps'], ['shoulders'], [
    'Hands just outside shoulder width; body stays a straight line.',
  ]),
  ex(70, 'pushup-wide', 'Wide-Grip Push-Up', 'upperPush', ['chest'], ['shoulders', 'triceps'], [
    'Hands wider than shoulder width; chest-focused, shorter range.',
  ]),
  ex(71, 'jumping-squat', 'Jumping Squat', 'lower', ['quadriceps', 'glutes'], ['hamstrings', 'calves'], [
    'Explode up out of the squat, land soft and reset before the next rep.',
  ]),
  ex(72, 'pull-up', 'Pull-Up', 'upperPull', ['lats'], ['biceps', 'middle back'], [
    'Overhand grip, dead hang to chin over the bar; no kipping.',
  ]),
  ex(73, 'chin-up', 'Chin-Up', 'upperPull', ['lats'], ['biceps', 'middle back'], [
    'Underhand grip; dead hang to chin over the bar, control the descent.',
  ]),
  ex(74, 'leg-raise-swings', 'Leg Raise Swings', 'accessory', ['abdominals'], ['hip flexors'], [
    'Lying or hanging; swing the legs together in a controlled arc, brace the core throughout.',
  ]),
  ex(75, 'bicycle-kicks', 'Bicycle Kicks', 'accessory', ['abdominals'], ['hip flexors'], [
    'Lower back pressed down; alternate knee-to-elbow, controlled tempo.',
  ]),
  ex(76, 'plank-hold', 'Plank', 'accessory', ['abdominals'], ['lower back'], [
    'Straight line from head to heels; brace and breathe, don’t let the hips sag.',
  ]),
].map((e) => ({ ...e, image: img(e.slug ?? '') }))

function ex(
  id: number,
  slug: string,
  name: string,
  category: Exercise['category'],
  primaryMuscles: string[],
  secondaryMuscles: string[],
  cues: string[],
): Exercise {
  return {
    id,
    slug,
    name,
    category,
    primaryMuscles,
    secondaryMuscles,
    cues,
    instructions: [],
    image: '',
    video: '',
    inProgram: true,
  }
}

// ── Sessions ─────────────────────────────────────────────────────────────────
// Locked 5-day gym split: Push · Pull · Upper #2 (Chest/Back/Delts) · Legs ·
// Arms, Forearms & Core. Priorities: V-taper (lat/delt width) and whole-arm
// growth (shoulder → forearm) get the extra volume and frequency, but every
// major muscle (chest, triceps, back thickness, legs, calves) still gets a
// real 2×/week dose — legs are trimmed moderately, not gutted, and chest/
// triceps get a genuine 2nd weekly touch on Day 3 rather than disappearing.
// No overhead/shoulder-press variants anywhere (shoulder tendonitis +
// instability — Cuban Press stands in for pressing, and face pulls/rear-delt
// work appear twice a week as rotator-cuff prehab). Push/Pull/Legs carry the
// heavy main lift for strength; Days 3 and 5 are pure higher-rep isolation
// volume — no repeated heavy compounds. Legs sits on Day 4 (not Day 3) so
// Pull's deadlift and Legs' squat/RDL aren't on back-to-back days — Day 3's
// isolation work gives the lower back/hamstrings a day to recover between.
// Plus a 6th, non-gym Calisthenics & Run session on Saturday.
// Each session gets its own timed warm-up and post-session stretch.
const WARMUP_UPPER_A = [
  'Arm circles + shoulder rolls (30s)',
  'Band pull-aparts (30s)',
  'Light cable/band external rotations (30s)',
  'Scapular pulldowns (30s)',
  'Wall slides (30s)',
  'Slow bodyweight push-ups (30s)',
]
const COOLDOWN_UPPER_A = [
  'Doorway chest stretch, 30s/side',
  'Lat stretch, 30s/side',
  'Overhead triceps / shoulder stretch, 30s/side',
]

const WARMUP_LOWER_A = [
  'Easy treadmill walk or bike (30s)',
  'Forward/back leg swings, 15s/leg',
  'Controlled bodyweight squats (30s)',
  'Bodyweight hip hinges (30s)',
  'Ankle rocks (30s)',
  'Alternating reverse lunges (30s)',
]
const COOLDOWN_LOWER_A = [
  'Hip-flexor stretch, 30s/side',
  'Hamstring stretch, 30s/side',
  'Standing quad stretch, 30s/side',
]

const WARMUP_UPPER_B = [
  'Easy rower or arm circles (30s)',
  'Band pull-aparts (30s)',
  'Light straight-arm pulldowns (30s)',
  'Scapular push-ups (30s)',
  'Light face pulls (30s)',
  'Slow incline or regular push-ups (30s)',
]
const COOLDOWN_UPPER_B = [
  'Chest stretch, 30s/side',
  'Cross-body rear-shoulder stretch, 30s/side',
  'Biceps wall stretch, 30s/side',
]

const WARMUP_LOWER_B = [
  'Easy treadmill walk or bike (30s)',
  'Glute bridges (30s)',
  'Controlled bodyweight squats (30s)',
  'Leg swings, 15s/leg',
  'Bodyweight good mornings (30s)',
  'Alternating lateral lunges (30s)',
]
const COOLDOWN_LOWER_B = [
  'Figure-four glute stretch, 30s/side',
  'Hamstring stretch, 30s/side',
  'Hip-flexor stretch, 30s/side',
]

const WARMUP_CALISTHENICS = [
  'Easy jog or jumping jacks (1 min)',
  'Arm circles + shoulder rolls (1 min)',
  'Bodyweight squats × 15 + leg swings, 30s/side (1 min)',
  'Push-up to downward dog + cat-cow (1 min)',
  'Dead hang + scapular pulls, 2–3 reps (1 min)',
]
const COOLDOWN_CALISTHENICS = [
  'Doorway chest stretch, 30s/side',
  "Child's pose lat stretch, 45s",
  'Standing quad stretch, 30s/side',
  'Seated hamstring stretch, 30s/side',
  'Calf stretch against a wall, 30s/side',
]

export const SESSIONS: Session[] = [
  {
    key: 'push',
    title: 'Day 1 — Push',
    order: 1,
    warmup: WARMUP_UPPER_A,
    cooldown: COOLDOWN_UPPER_A,
    items: [
      item(7, 4, 4, 6, '8'), // Flat Barbell Bench Press — main lift, heaviest first
      item(10, 4, 8, 12, '8'), // Incline DB Press — 2nd compound while still fresh
      item(48, 3, 8, 12, '8', 'full range — stop the set if the shoulder pinches'), // Triceps Dips — compound, before isolation work
      item(46, 3, 12, 15, '9'), // Cable Fly / Pec Deck — chest isolation
      item(11, 4, 15, 20, '9', 'raise to shoulder height only, no higher'), // Lateral Raise — delt isolation
      item(77, 4, 12, 15, '7'), // Cuban Press — light rehab work, after the joint is warm
      item(12, 3, 10, 15, '9'), // Rope Triceps Pushdown — smallest muscle, isolated last
    ],
  },
  {
    key: 'pull',
    title: 'Day 2 — Pull',
    order: 2,
    warmup: WARMUP_UPPER_B,
    cooldown: COOLDOWN_UPPER_B,
    items: [
      item(54, 3, 4, 6, '8'), // Deadlift — main lift, kept low-volume for fatigue management
      item(50, 5, 8, 12, '8'), // Wide Lat Pulldown — back-width priority, 1st of 2 weekly exposures (bumped: vertical-pull volume was under the 10-12 set target for lat width)
      item(61, 3, 10, 12, '8'), // Single-Arm Chest-Supported Row (swap for T-Bar Row — chest pad removes shoulder/low-back shear)
      item(23, 3, 15, 20, '9'), // Face Pull — rear delt + rotator-cuff health, 1st of 2 weekly exposures
      item(55, 4, 12, 15, '9'), // Rear Delt Fly — V-taper rear-delt width
      item(36, 3, 10, 15, '9'), // Incline DB Curl
      item(56, 4, 10, 15, '9'), // Hammer Curl — biceps + forearm
      item(58, 2, 10, 15, 'hard', 'core'), // Weighted Decline Sit-Up — your pick for ab work
    ],
  },
  {
    key: 'legs',
    title: 'Day 4 — Legs',
    order: 4,
    warmup: WARMUP_LOWER_A,
    cooldown: COOLDOWN_LOWER_A,
    items: [
      item(1, 4, 5, 8, '8'), // Barbell Back Squat — main lift, heaviest first
      item(2, 4, 8, 12, '8'), // Romanian Deadlift — 2nd compound, hip-hinge pattern
      item(43, 4, 10, 15, '8'), // Leg Press — secondary compound
      item(67, 3, 8, 12, '8', 'per leg'), // Bulgarian Split Squat — unilateral, before pure isolation
      item(62, 3, 8, 12, '8'), // 45° Back Extension — trimmed; posterior chain already loaded by Squat/RDL/Deadlift this week
      item(5, 4, 10, 15, '9'), // Standing Calf Raise — isolation
      item(4, 3, 10, 15, 'hard', 'core'), // Hanging Leg Raise — core, last
    ],
  },
  {
    key: 'upperTwo',
    title: 'Day 3 — Upper (Chest · Back · Delts)',
    order: 3,
    warmup: WARMUP_UPPER_A,
    cooldown: COOLDOWN_UPPER_A,
    items: [
      item(64, 4, 10, 15, '8'), // Plate-Loaded Chest Press — chest's 2nd weekly exposure, restored (one movement, 4 sets — not redundant volume)
      item(65, 5, 8, 12, '8'), // Pull-Up / Neutral-Grip Lat Pulldown — 2nd WIDTH exposure, bumped for the same reason
      item(41, 4, 15, 20, '9'), // Reverse Pec Deck — 2nd rear-delt exposure
      item(11, 4, 15, 20, '9', 'raise to shoulder height only, no higher'), // Lateral Raise — 2nd delt exposure
      item(32, 4, 10, 12, '8'), // Skullcrusher — triceps LONG HEAD (lying, shoulder-safer than standing overhead cable extension)
    ],
  },
  {
    key: 'armsForearms',
    title: 'Day 5 — Arms, Forearms & Leg Finishers',
    order: 5,
    warmup: WARMUP_UPPER_B,
    cooldown: COOLDOWN_LOWER_B,
    items: [
      item(37, 3, 10, 15, '9'), // EZ-Bar Curl — kept this one curl variation per the balance review, dropped Preacher Curl's overlap
      item(12, 3, 10, 15, '9'), // Rope Triceps Pushdown — this "arms" day had biceps + forearms but no triceps; added for symmetry
      item(79, 2, 10, 15, '9'), // Reverse Curl — forearm extensors + brachialis, distinct from the biceps curls
      item(78, 3, 12, 20, '9'), // Barbell Wrist Curl — direct forearm volume
      item(23, 3, 15, 20, '9'), // Face Pull — 2nd rotator-cuff/rear-delt exposure
      item(44, 4, 10, 15, '9'), // Seated Leg Curl — moved off Legs day to keep that session shorter
      item(18, 2, 12, 20, '9'), // Seated Calf Raise — keeps calves at 2×/week
      item(29, 3, 8, 15, 'hard', 'core · or Pallof press'), // Ab Wheel / Pallof Press
      item(75, 2, null, 50, 'hard', 'core · 50 kicks/set'), // Bicycle Kicks — your ab-volume addition, kept
    ],
  },
  {
    key: 'calisthenicsRun',
    title: 'Calisthenics & Run Session',
    order: 6,
    warmup: WARMUP_CALISTHENICS,
    cooldown: COOLDOWN_CALISTHENICS,
    items: [
      item(68, 1, null, 50, 'hard', 'slow + explosive tempo — work up to 50 reps'), // Close-Grip Push-Up
      item(69, 1, null, 50, 'hard', 'slow + explosive tempo — work up to 50 reps'), // Push-Up
      item(70, 1, null, 50, 'hard', 'slow + explosive tempo — work up to 50 reps'), // Wide-Grip Push-Up
      item(71, 3, null, 50, 'hard', 'skip on gym leg days'), // Jumping Squat
      item(72, 3, 12, 15, '8'), // Pull-Up
      item(73, 3, 12, 15, '8'), // Chin-Up
      item(74, 3, null, 100, 'hard', 'core · 100 swings/set'), // Leg Raise Swings
      item(75, 3, null, 50, 'hard', 'core · 50 kicks/set'), // Bicycle Kicks
      item(76, 3, null, null, 'hard', 'core · 1 minute hold/set'), // Plank
    ],
  },
]

function item(
  exerciseId: number,
  sets: number,
  repLow: number | null,
  repHigh: number | null,
  rpe: string,
  note = '',
) {
  return { exerciseId, sets, repLow, repHigh, rpe, note }
}

// ── Week plan ────────────────────────────────────────────────────────────────
// Locked 5-day gym split: Push · Pull · Upper #2 · Legs · Arms, Forearms &
// Core, plus a Calisthenics & Run session on Saturday. Sunday
// stays a full rest day. Fully editable in Program → Day editor.
export const WEEK_PLAN: WeekPlanDay[] = [
  {
    day: 'Mon',
    am: [{ type: 'gym', sessionKey: 'push', minutes: 62 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Tue',
    am: [{ type: 'gym', sessionKey: 'pull', minutes: 67 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Wed',
    am: [{ type: 'gym', sessionKey: 'upperTwo', minutes: 56 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Thu',
    am: [{ type: 'gym', sessionKey: 'legs', minutes: 61 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Fri',
    am: [{ type: 'gym', sessionKey: 'armsForearms', minutes: 65 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Sat',
    am: [
      { type: 'calisthenics', sessionKey: 'calisthenicsRun', minutes: 45 },
      { type: 'run', runType: 'midPace', minutes: 25, text: '5 km mid-pace run · 4:45–5:00/km' },
    ],
    pm: [],
    isRest: false,
  },
  {
    day: 'Sun',
    am: [],
    pm: [],
    isRest: true,
  },
]

// ── Runs / metcons ───────────────────────────────────────────────────────────
export const RUNS: Run[] = [
  { key: 'easy', label: 'Easy + strides', paceNote: '~5:00/km', detail: '30–40 min easy, then 6 × 20s strides' },
  { key: 'interval', label: 'VO2 intervals', paceNote: '5k pace ~4:00/km', detail: '5 × 3 min @ 5k pace, 90s jog (or 6–8 × 400–800 m). VO2-max focus — go in fresh.' },
  { key: 'tempo', label: 'Tempo', paceNote: 'threshold ~4:20–4:30/km', detail: '20–30 min continuous, comfortably hard.' },
  { key: 'long', label: 'Long run', paceNote: '~5:00/km easy', detail: '60–90 min easy aerobic base.' },
  { key: 'midPace', label: 'Mid pace', paceNote: '4:45–5:00/km', detail: '5 km @ 4:45–5:00/km, steady effort.' },
]

export const METCONS: Metcon[] = [
  { name: 'Bodyweight AMRAP', format: 'AMRAP 15 min', detail: '5 pull-ups · 10 push-ups · 15 air squats' },
  { name: 'KB/DB EMOM', format: 'EMOM 16 min', detail: 'odd: 12 KB/DB swings · even: 8 burpees' },
  { name: 'Triplet', format: '3 rounds for time', detail: '12 DB thrusters · 9 pull-ups · 400 m run' },
  { name: 'Couplet 21-15-9', format: 'For time', detail: 'light deadlifts (~40% working) · burpees' },
]

// ── Nutrition / meals ────────────────────────────────────────────────────────
export const NUTRITION: Nutrition = {
  id: 'targets',
  calories: 3000,
  protein_g: 155,
  fat_g: 80,
  carbs_g: 400,
  water_l: 3.5,
  creatine_g: 5,
  exampleDay: [
    '4 eggs + 2 wholegrain toast + Greek yogurt + banana',
    'Chicken 200g + rice 100g(dry) + olive oil + salad',
    'Whey + oats 80g + fruit',
    'Salmon/lean beef 180–200g + potatoes/pasta + veg',
    'Greek yogurt/cottage cheese + nuts + honey',
  ],
  supplements: [
    'Creatine monohydrate 5g daily',
    'Whey protein as needed',
    'Vitamin D3 if bloods low',
  ],
}

export const MEAL_PRESETS: MealPreset[] = [
  { name: 'Eggs + oats', slot: 'Breakfast', kcal: 620, protein_g: 34, carbs_g: 70, fat_g: 22 },
  { name: 'Chicken + rice', slot: 'Lunch', kcal: 710, protein_g: 55, carbs_g: 85, fat_g: 14 },
  { name: 'Whey + banana', slot: 'Shake', kcal: 280, protein_g: 30, carbs_g: 35, fat_g: 4 },
  { name: 'Salmon + potato', slot: 'Dinner', kcal: 640, protein_g: 42, carbs_g: 45, fat_g: 28 },
]

// ── Guidance (principles) ────────────────────────────────────────────────────
export const GUIDANCE: Guidance[] = [
  {
    order: 1,
    title: 'The Frame',
    body: 'Build muscle and strength across every muscle group. **Recovery is the limiter, not effort** — muscle is built recovering from training. Cardio is done separately and kept out of this plan.',
  },
  {
    order: 2,
    title: 'Progressive overload',
    body: 'Hit the **top** of the rep range on all sets at the target RPE → add weight (upper +1–2.5 kg, lower +2.5–5 kg) and drop to the **bottom** of the range. Log every set; beat last week.',
  },
  {
    order: 3,
    title: 'Rest periods',
    body: 'Compounds (squat, deadlift, bench, row) get **2–3 min** rest — RPE 8 there means ~2 reps left in the tank, not a grind. Isolation work gets 1–2 min, and RPE 9 is reserved for that, not every set. Longer rest on the big lifts is also why real session time runs longer than the app’s simple per-set estimate.',
  },
  {
    order: 4,
    title: 'Volume is kept high — recover for it',
    body: 'Shoulders, lats and arms are trained hard, ~2×/week each, for V-taper width and whole-arm size; legs are maintenance-dosed on purpose. That only builds muscle if you recover: protein ~1.6–2.2 g/kg, sleep 7–9 h, eat at/above maintenance.',
  },
  {
    order: 5,
    title: 'Shoulder health first',
    body: 'No overhead pressing anywhere in this program (tendonitis + instability). Cuban Press and the doubled-up Face Pull/Rear Delt work are rehab, not filler — never skip them, and cap every lateral raise at shoulder height. If a lift pinches, stop the set.',
  },
  {
    order: 6,
    title: 'Autoregulate',
    body: 'If a muscle stalls or a joint aches, **remove 2–4 sets** from it — Day 3’s 2nd chest/back touch and Day 5’s forearm work are the first to trim. Don’t add past what you recover from.',
  },
]

// ── Goals / standards ────────────────────────────────────────────────────────
export const GOALS: Goal[] = [
  { label: 'Back Squat → 100 kg', current: '82.5', target: '100', unit: 'kg', accent: 'clay' },
  { label: '5k under 19:00', current: '19:40', target: '19:00', unit: '', accent: 'sage' },
  { label: 'First one-arm pull-up', current: 'in progress', target: '1', unit: '', accent: 'clay' },
  { label: 'Stay lean while bodyweight drifts up slowly', current: '', target: '', unit: '', accent: 'sage' },
]

// Explicit ids so a "reset to seed" re-creates standards with the SAME ids —
// standardsLog.done is keyed by these ids, so streak history stays valid.
export const STANDARDS: StandardDef[] = [
  { id: 1, label: 'Trained', order: 1 },
  { id: 2, label: 'Creatine', order: 2 },
  { id: 3, label: 'Sleep 7–9 h', order: 3 },
  { id: 4, label: 'Water', order: 4 },
  { id: 5, label: 'Protein', order: 5 },
  { id: 6, label: 'Mobility', order: 6 },
]

// ── Reminders ────────────────────────────────────────────────────────────────
export const REMINDERS: Reminder[] = [
  { type: 'creatine', time: '08:00', enabled: true, message: 'Take creatine (5 g)' },
  { type: 'water', time: '12:00', enabled: true, message: 'Drink water' },
  { type: 'water', time: '16:00', enabled: true, message: 'Drink water' },
  { type: 'weighIn', time: '07:30', enabled: true, message: 'Morning weigh-in' },
  { type: 'session', time: '07:00', enabled: true, message: "Today's session" },
  { type: 'sleep', time: '22:30', enabled: true, message: 'Sleep wind-down' },
  { type: 'mobility', time: '20:00', enabled: true, message: 'Mobility' },
  { type: 'weeklyReview', time: '18:00', enabled: true, message: 'Weekly review (Sun)' },
]

// ── Motivation ───────────────────────────────────────────────────────────────
export const MOTIVATION: Motivation[] = [
  'Recovery is the limiter, not effort. Sleep like it’s training.',
  'You don’t rise to your goals; you fall to your standards. Hit today’s.',
  'Squat heavier than last week, or you didn’t progress. Check the log.',
  'Discipline is doing it on the day you don’t feel like it.',
  'Lean is built in the kitchen and in bed, not only in the gym.',
  'Every set you log is a promise to next week’s you.',
  'The engine’s already strong — today, build the body.',
  'Eat the protein. Drink the water. Take the creatine. Win the basics.',
  'Consistency for years beats intensity for weeks.',
  'Comfort is the enemy. One more honest rep.',
].map((text) => ({ text, enabled: true }))

// ── Settings ─────────────────────────────────────────────────────────────────
export const SETTINGS: Setting[] = [
  { key: 'profile', value: { name: '' } },
  { key: 'units', value: 'metric' },
  { key: 'theme', value: 'terra' },
  { key: 'strengthReport', value: [] },
  {
    key: 'mobilityRoutine',
    value:
      'Dynamic (pre-lower): leg swings ×10 each · world’s greatest stretch ×5/side · Cossack squats ×8/side · deep squat hold 30–60s.\n' +
      'Static/PNF (post + Wed): couch stretch 2×45s/side · hamstring PNF 2×30–45s/side · 90/90 hip rotations 2×8/side · adductor rockback 2×30s · pancake/pike 2×60s · ankle dorsiflexion 2×10/side.\n' +
      'Daily: accumulate 1–2 min in a deep squat.',
  },
]

// ── Seeding ──────────────────────────────────────────────────────────────────
/** Runs inside db.on('populate') — fills every content table once. */
export async function seedDatabase(db: AppDB): Promise<void> {
  await Promise.all([
    db.exercises.bulkAdd(EXERCISES),
    db.sessions.bulkAdd(SESSIONS),
    db.weekPlan.bulkAdd(WEEK_PLAN),
    db.runs.bulkAdd(RUNS),
    db.metcons.bulkAdd(METCONS),
    db.nutrition.add(NUTRITION),
    db.mealPresets.bulkAdd(MEAL_PRESETS),
    db.guidance.bulkAdd(GUIDANCE),
    db.goals.bulkAdd(GOALS),
    db.standardsDef.bulkAdd(STANDARDS),
    db.reminders.bulkAdd(REMINDERS),
    db.motivation.bulkAdd(MOTIVATION),
    db.settings.bulkAdd(SETTINGS),
  ])
}

/** Clear content tables and re-seed (logs are preserved). Used by Settings later. */
export async function resetToSeed(db: AppDB): Promise<void> {
  const content = [
    db.exercises, db.sessions, db.weekPlan, db.runs, db.metcons, db.nutrition,
    db.mealPresets, db.guidance, db.goals, db.standardsDef, db.reminders,
    db.motivation, db.settings,
  ]
  await db.transaction('rw', content, async () => {
    await Promise.all(content.map((t) => t.clear()))
    await seedDatabase(db)
  })
}
