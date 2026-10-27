import type { AppDB } from './db'
import type {
  Exercise,
  Session,
  WeekPlanDay,
  Run,
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

  // ── Program revision additions ────────────────────────────────────────────
  // Ids start at 1001 (not 80) because library imports auto-increment from the
  // highest id — on existing installs 80+ may already belong to a user import.
  ex(1001, 'v-grip-standing-cable-row', 'V-Grip Standing Cable Row', 'upperPull', ['middle back', 'lats'], ['biceps'], [
    'Stand tall, soft knees; pull the V-handle to the stomach and squeeze the shoulder blades.',
    'Upright torso — no lower-back load after the deadlifts.',
  ]),
  ex(1002, 'single-arm-cable-rear-delt-fly', 'Single-Arm Cable Rear Delt Fly', 'accessory', ['shoulders'], ['traps', 'middle back'], [
    'Pulley at shoulder height; pull across and out with a slight elbow bend.',
    'Rear-delt focus — don’t let the traps shrug the weight.',
  ]),
  ex(1003, 'decline-crunch', 'Decline Crunch', 'accessory', ['abdominals'], [], [
    'Curl the ribs toward the hips — a short crunch, not a full sit-up.',
    'Hold a plate on the chest once bodyweight reps get easy.',
  ]),
  ex(1004, 'russian-twist', 'Russian Twist', 'accessory', ['abdominals', 'obliques'], ['hip flexors'], [
    'Lean back, chest up; rotate the shoulders, not just the arms.',
    'Hold a plate or dumbbell; feet down until it’s easy.',
  ]),
  ex(1005, 'hip-adduction-machine', 'Hip Adduction Machine', 'accessory', ['adductors'], [], [
    'Squeeze the knees together under control; slow on the way back out.',
  ]),
  ex(1006, 'single-arm-cable-front-raise', 'Single-Arm Cable Front Raise', 'accessory', ['shoulders'], [], [
    'Thumbs-up (neutral) grip; raise to shoulder height only, no higher.',
    'Light and controlled — stop the set if the shoulder pinches.',
  ]),
  ex(1007, 'single-arm-cable-lateral-raise', 'Single-Arm Cable Lateral Raise', 'accessory', ['shoulders'], [], [
    'Pulley low, cable behind the body; lead with the elbow out to the side.',
    'Shoulder height only; tension stays on at the bottom.',
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
// Locked 5-day gym split: Push · Pull · Legs · Upper #2 (Chest/Back/Delts) ·
// Arms, Forearms & Core. Priorities: V-taper (lat/delt width) and whole-arm
// growth (shoulder → forearm) get the extra volume and frequency, but every
// major muscle still gets a real weekly dose. Sets are capped at 4 (only the
// day's main lift or lateral raises get 4; everything else 3), and each
// exercise within a muscle group has its own job — legs cover squat, hinge,
// knee-flexion, knee-extension and adduction rather than three overlapping
// quad compounds; Day 4's back work covers width, lats and upper back.
// No overhead/shoulder-press variants anywhere (shoulder tendonitis +
// instability — Cuban Press stands in for pressing, front/lateral raises stop
// at shoulder height, and face pulls/rear-delt work appear on 4 days as
// rotator-cuff prehab). Push/Pull/Legs carry the heavy main lift for
// strength; Days 4 and 5 are higher-rep volume. Legs now follows Pull
// directly (your call) — keep the RDL at RPE 8 if the lower back is still
// tired from Tuesday's deadlift.
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
      item(10, 3, 8, 12, '8'), // Incline DB Press — 2nd compound while still fresh
      item(48, 3, 8, 12, '8', 'full range — stop the set if the shoulder pinches'), // Triceps Dips — compound, before isolation work
      item(46, 3, 12, 15, '9'), // Cable Fly / Pec Deck — chest isolation
      item(11, 4, 15, 20, '9', 'raise to shoulder height only, no higher'), // Lateral Raise — delt isolation
      item(77, 3, 12, 15, '7'), // Cuban Press — light rehab work, after the joint is warm
      item(12, 3, 10, 15, '9'), // Rope Triceps Pushdown — smallest muscle, isolated last
      item(1006, 3, 12, 15, '9', 'one arm at a time · thumbs-up grip, shoulder height only'), // Cable Front Raise — the only direct front-delt work
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
      item(50, 4, 8, 12, '8'), // Wide Lat Pulldown — back-width priority, 1st of 2 weekly vertical pulls
      item(1001, 3, 8, 12, '8'), // V-Grip Standing Cable Row — horizontal pull, upright so the lower back rests after deadlifts
      item(23, 3, 15, 20, '9'), // Face Pull — rear delt + rotator-cuff health, 1st of 2 weekly exposures
      item(1002, 3, 12, 15, '9', 'one arm at a time'), // Single-Arm Cable Rear Delt Fly — replaces the DB rear delt fly
      item(36, 3, 10, 15, '9'), // Incline DB Curl
      item(56, 3, 10, 15, '9'), // Hammer Curl — biceps + forearm
      item(1003, 3, 12, 15, 'hard', 'core'), // Decline Crunch — weighted flexion, replaces the decline sit-up
    ],
  },
  {
    key: 'legs',
    title: 'Day 3 — Legs',
    order: 3,
    warmup: WARMUP_LOWER_A,
    cooldown: COOLDOWN_LOWER_A,
    items: [
      item(1, 4, 5, 8, '8'), // Barbell Back Squat — main lift: quads, glutes, adductors
      item(2, 3, 8, 12, '8'), // Romanian Deadlift — hamstrings via the hip hinge
      item(45, 3, 10, 12, '9'), // Lying Leg Curl — hamstrings via knee flexion (replaces Leg Press, which overlapped the squat)
      item(67, 3, 8, 12, '8', 'per leg'), // Bulgarian Split Squat — unilateral glutes/quads + hip stability
      item(60, 3, 12, 15, '9'), // Leg Extension — rectus femoris, which squats under-train (replaces 45° Back Extension)
      item(1005, 3, 12, 15, '9'), // Hip Adduction Machine — direct adductor work
      item(5, 3, 10, 15, '9'), // Standing Calf Raise — gastrocnemius
      item(4, 3, 10, 15, 'hard', 'core'), // Hanging Leg Raise — core, last
    ],
  },
  {
    key: 'upperTwo',
    title: 'Day 4 — Upper (Chest · Back · Delts)',
    order: 4,
    warmup: WARMUP_UPPER_A,
    cooldown: COOLDOWN_UPPER_A,
    items: [
      item(64, 3, 10, 15, '8'), // Plate-Loaded Chest Press — chest's 2nd weekly exposure
      item(65, 3, 8, 12, '8'), // Pull-Up / Neutral-Grip Lat Pulldown — lat width, 2nd vertical pull
      item(63, 3, 10, 12, '8', 'one arm at a time'), // Plate-Loaded Row Machine, single-arm — lats, horizontal pull
      item(52, 3, 10, 12, '8', 'wide grip · pull to the upper chest, elbows flared'), // Seated Cable Row, wide — upper back / traps thickness
      item(41, 3, 15, 20, '9'), // Reverse Pec Deck — 2nd rear-delt exposure
      item(11, 4, 15, 20, '9', 'raise to shoulder height only, no higher'), // Lateral Raise — 2nd delt exposure
      item(32, 3, 10, 12, '8'), // Skullcrusher — triceps LONG HEAD (lying, shoulder-safer than standing overhead cable extension)
      item(1004, 3, null, 20, 'hard', 'core · 20 twists/set (10 per side)'), // Russian Twist — obliques / rotation
    ],
  },
  {
    key: 'armsForearms',
    title: 'Day 5 — Arms, Forearms & Leg Finishers',
    order: 5,
    warmup: WARMUP_UPPER_B,
    cooldown: COOLDOWN_LOWER_B,
    items: [
      item(37, 3, 10, 15, '9'), // EZ-Bar Curl
      item(12, 3, 10, 15, '9'), // Rope Triceps Pushdown — this "arms" day had biceps + forearms but no triceps; added for symmetry
      item(57, 3, 10, 15, '9'), // Preacher / Cable Curl — 2nd curl, arm in front of the body (replaces Reverse Curl; Hammer + Wrist Curl cover forearms)
      item(78, 3, 12, 20, '9'), // Barbell Wrist Curl — direct forearm volume
      item(23, 3, 15, 20, '9'), // Face Pull — 2nd rotator-cuff/rear-delt exposure
      item(1007, 3, 15, 20, '9', 'one arm at a time · shoulder height only'), // Cable Lateral Raise — 3rd weekly side-delt exposure
      item(44, 3, 10, 15, '9'), // Seated Leg Curl — 2nd weekly knee-flexion hamstring dose
      item(18, 3, 12, 20, '9'), // Seated Calf Raise — soleus; keeps calves at 2×/week
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
// Locked 5-day gym split: Push · Pull · Legs · Upper #2 · Arms, Forearms &
// Core, plus a Calisthenics & Run session on Saturday. Sunday
// stays a full rest day. Fully editable in Program → Day editor.
// Minutes are real-session estimates: 2–3 min rest on compounds, 1–2 min on
// isolation, warm-up sets on the main lift, setup, warm-up and cooldown.
export const WEEK_PLAN: WeekPlanDay[] = [
  {
    day: 'Mon',
    am: [{ type: 'gym', sessionKey: 'push', minutes: 80 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Tue',
    am: [{ type: 'gym', sessionKey: 'pull', minutes: 77 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Wed',
    am: [{ type: 'gym', sessionKey: 'legs', minutes: 79 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Thu',
    am: [{ type: 'gym', sessionKey: 'upperTwo', minutes: 74 }],
    pm: [],
    isRest: false,
  },
  {
    day: 'Fri',
    am: [{ type: 'gym', sessionKey: 'armsForearms', minutes: 73 }],
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
    body: 'Shoulders, lats and arms are trained hard, ~2×/week each, for V-taper width and whole-arm size. Legs get a complete dose — squat, hinge, leg curl, leg extension and adduction — with hamstrings and calves hit twice. That only builds muscle if you recover: protein ~1.6–2.2 g/kg, sleep 7–9 h, eat at/above maintenance.',
  },
  {
    order: 5,
    title: 'Shoulder health first',
    body: 'No overhead pressing anywhere in this program (tendonitis + instability). Cuban Press and the doubled-up Face Pull/Rear Delt work are rehab, not filler — never skip them, and cap every lateral and front raise at shoulder height. If a lift pinches, stop the set.',
  },
  {
    order: 6,
    title: 'Autoregulate',
    body: 'If a muscle stalls or a joint aches, **remove 2–4 sets** from it — Day 4’s 2nd chest/back touch and Day 5’s forearm work are the first to trim. Don’t add past what you recover from.',
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
  // Target bodyweight (kg) for the Today-screen "Weight goal" card.
  { key: 'weightGoalKg', value: 70 },
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
    db.exercises, db.sessions, db.weekPlan, db.runs, db.nutrition,
    db.mealPresets, db.guidance, db.goals, db.standardsDef, db.reminders,
    db.motivation, db.settings,
  ]
  await db.transaction('rw', content, async () => {
    await Promise.all(content.map((t) => t.clear()))
    await seedDatabase(db)
  })
}
