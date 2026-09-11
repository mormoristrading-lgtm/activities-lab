import type { LibraryExercise } from '../db/types'

// Curated running form drills. The bundled dataset (free-exercise-db) only has
// machine cardio, so these are hand-written. Shaped like a LibraryExercise and
// tagged category 'running' so disciplineOf() routes them to the Running group.
// No images ship for these — the Library card renders an empty surface.

const drill = (
  id: string,
  name: string,
  primaryMuscles: string[],
  instructions: string[],
): LibraryExercise => ({
  id,
  name,
  category: 'running',
  equipment: 'body only',
  primaryMuscles,
  secondaryMuscles: [],
  instructions,
  images: [],
})

export const RUNNING_DRILLS: LibraryExercise[] = [
  drill('run-strides', 'Strides', ['quadriceps', 'hamstrings', 'calves'], [
    'On flat ground, accelerate smoothly to ~90% of top speed over 20–30 m.',
    'Stay tall and relaxed — fast feet, loose shoulders, no straining.',
    'Walk back fully to recover. Repeat 4–8 times after an easy run.',
  ]),
  drill('run-a-skip', 'A-Skip', ['quadriceps', 'hamstrings', 'calves'], [
    'Skip forward driving one knee up to hip height while the opposite arm swings.',
    'Strike the ground under your hips with the ball of the foot; stay tall.',
    'Keep a quick, rhythmic cadence for 15–20 m.',
  ]),
  drill('run-b-skip', 'B-Skip', ['hamstrings', 'glutes', 'calves'], [
    'From the A-skip, drive the knee up then extend the lower leg forward.',
    'Paw the ground back actively under your body as the foot lands.',
    'Maintain rhythm and posture for 15–20 m.',
  ]),
  drill('run-high-knees', 'High Knees', ['quadriceps', 'hamstrings', 'calves'], [
    'Run in place or moving slightly forward, driving knees to hip height.',
    'Stay on the balls of the feet with a fast arm swing and tall torso.',
    'Hold for 15–20 m or 20–30 s.',
  ]),
  drill('run-butt-kicks', 'Butt Kicks', ['hamstrings', 'quadriceps'], [
    'Jog in place flicking the heels up toward the glutes.',
    'Keep the thighs roughly vertical and the cadence quick.',
    'Continue for 15–20 m or 20–30 s.',
  ]),
  drill('run-leg-swings', 'Leg Swings', ['hamstrings', 'glutes', 'adductors'], [
    'Hold a support and swing one leg forward and back through a full range.',
    'Then swing it side to side across the body.',
    'Do 10–12 each direction per leg before running.',
  ]),
  drill('run-carioca', 'Carioca', ['adductors', 'abductors', 'glutes'], [
    'Move laterally, crossing the trailing leg alternately in front of and behind the lead leg.',
    'Rotate the hips while keeping the shoulders square.',
    'Cover 15–20 m each direction.',
  ]),
  drill('run-ankling', 'Ankling', ['calves'], [
    'Take very short, quick steps using mostly the ankles and balls of the feet.',
    'Minimise knee drive; feel a fast ground contact.',
    'Continue for 15–20 m.',
  ]),
  drill('run-fast-feet', 'Fast Feet', ['calves', 'quadriceps'], [
    'Take the quickest small steps you can while moving slowly forward.',
    'Stay on the balls of the feet with light, rapid contacts.',
    'Hold for 10–15 m, then ease into a stride.',
  ]),
  drill('run-walking-lunge', 'Walking Lunge (warm-up)', ['quadriceps', 'glutes', 'hamstrings'], [
    'Step forward into a lunge until both knees are ~90°.',
    'Drive through the front heel and step directly into the next lunge.',
    'Continue for 10–12 per leg as a dynamic warm-up.',
  ]),
]
