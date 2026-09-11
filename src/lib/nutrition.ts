import type { LoggedMeal } from '../db/types'

export interface MacroTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

/** Sum a day's logged meals into macro totals. */
export function mealTotals(meals: LoggedMeal[] = []): MacroTotals {
  return meals.reduce<MacroTotals>(
    (a, m) => ({
      calories: a.calories + m.kcal,
      protein_g: a.protein_g + m.protein_g,
      carbs_g: a.carbs_g + m.carbs_g,
      fat_g: a.fat_g + m.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )
}
