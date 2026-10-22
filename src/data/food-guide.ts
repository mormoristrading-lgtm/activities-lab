// Static reference content for the Fuel → Food guide segment. Not stored in
// the DB and not user-editable — it's a fixed cheat-sheet, not logged data,
// so there's no table/migration/editor to maintain for it.

export interface FoodItem {
  emoji: string
  name: string
  note: string
}

export interface NutrientGuide {
  key: 'protein' | 'carbs' | 'fat' | 'water' | 'creatine'
  label: string
  why: string
  best: FoodItem[]
  budget: FoodItem[]
}

export const FOOD_GUIDE: NutrientGuide[] = [
  {
    key: 'protein',
    label: 'Protein',
    why: 'Builds and repairs the muscle you train — the single most important target for a lean bulk. Spread it across 3–4 meals.',
    best: [
      { emoji: '🍗', name: 'Chicken breast', note: '~31g per 100g — lean, cheap enough, your workhorse' },
      { emoji: '🐟', name: 'Salmon', note: '~25g per 100g + omega-3s — best quality, pricier' },
      { emoji: '🥛', name: 'Greek yogurt', note: '~10g per 100g — zero prep, also calcium' },
    ],
    budget: [
      { emoji: '🥚', name: 'Eggs', note: '~6g each — cheapest complete protein there is' },
      { emoji: '🥫', name: 'Canned tuna', note: '~25g per 100g — long shelf life, very cheap per gram' },
      { emoji: '🫘', name: 'Lentils / beans', note: '~9g per 100g cooked — cheapest plant protein + fiber' },
      { emoji: '🧀', name: 'Cottage cheese', note: '~11g per 100g — cheap, filling, good before bed' },
    ],
  },
  {
    key: 'carbs',
    label: 'Carbs',
    why: 'Fuels the lifts and refills what you burn in the gym — don’t cut these to save money or calories.',
    best: [
      { emoji: '🥣', name: 'Oats', note: 'Slow-release energy, high fiber, cheap per serving too' },
      { emoji: '🍠', name: 'Sweet potato', note: 'Dense in potassium + vitamin A alongside the carbs' },
      { emoji: '🍌', name: 'Bananas', note: 'Fast carbs, portable — good pre/post workout' },
    ],
    budget: [
      { emoji: '🍚', name: 'White rice', note: 'Cheapest calories per gram — easiest way to hit a high target' },
      { emoji: '🍝', name: 'Pasta', note: 'Cheap, filling, keeps well — bulk-cook it' },
      { emoji: '🥔', name: 'Potatoes', note: 'Very cheap, very filling, good micronutrients' },
      { emoji: '🍞', name: 'Bread', note: 'Cheap and convenient — pair with the protein picks above' },
    ],
  },
  {
    key: 'fat',
    label: 'Fat',
    why: 'Needed for hormone production (testosterone included) — don’t go too low chasing a lean look.',
    best: [
      { emoji: '🫒', name: 'Olive oil', note: 'Heart-healthy monounsaturated fat — drizzle on anything' },
      { emoji: '🥑', name: 'Avocado', note: 'Fat plus fiber and potassium — pricier but nutrient-dense' },
      { emoji: '🥜', name: 'Almonds / mixed nuts', note: 'Easy snack, good fats — watch the portion, calorie-dense' },
    ],
    budget: [
      { emoji: '🥜', name: 'Peanut butter', note: 'Cheap, calorie-dense — an easy way to add calories to hit a bulk' },
      { emoji: '🛢️', name: 'Sunflower / vegetable oil', note: 'Cheapest way to add fat calories to cooked meals' },
      { emoji: '🥚', name: 'Whole eggs', note: 'Fat + protein together — don’t go egg-white only' },
    ],
  },
  {
    key: 'water',
    label: 'Water',
    why: 'Recovery, performance, and appetite all suffer when you’re under-hydrated — this one is free.',
    best: [
      { emoji: '💧', name: 'Tap / filtered water', note: 'Carry a bottle, refill through the day — free and sufficient' },
      { emoji: '🧂', name: 'A pinch of salt (hot weather / heavy sweat days)', note: 'Helps retention — no need for sports drinks' },
    ],
    budget: [
      { emoji: '💧', name: 'Tap water', note: 'Same as above — there is no cheaper or better option' },
    ],
  },
  {
    key: 'creatine',
    label: 'Creatine',
    why: 'The most proven, cheapest supplement for strength and muscle gain. Timing doesn’t matter — just take it daily.',
    best: [
      { emoji: '🥄', name: 'Plain creatine monohydrate powder', note: 'Unflavored, bulk tub — just as effective as any "advanced" formula, far cheaper' },
    ],
    budget: [
      { emoji: '🥄', name: 'Plain creatine monohydrate powder', note: 'Same product — buy the biggest plain tub you can, skip flavored/branded markups' },
    ],
  },
]
