import type { ActivityLevel, Macros, Phase, Profile, Sex } from '@/types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** Mifflin-St Jeor BMR */
export function calcBmr(profile: Profile, weightKg: number): number {
  const { sex, age, heightCm } = profile
  const s = sex === 'male' ? 5 : sex === 'female' ? -161 : -78
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s
}

export function calcTdee(profile: Profile, weightKg: number): number {
  return Math.round(calcBmr(profile, weightKg) * ACTIVITY_MULTIPLIERS[profile.activity])
}

export function phaseCalorieTarget(tdee: number, phase: Phase): number {
  switch (phase) {
    case 'bulk':
      return Math.round(tdee + 250)
    case 'cut':
      return Math.round(tdee - 400)
    default:
      return Math.round(tdee)
  }
}

export function proteinPerKg(phase: Phase): number {
  switch (phase) {
    case 'cut':
      return 2.2
    case 'bulk':
      return 1.8
    default:
      return 1.8
  }
}

export function calcMacroSplit(
  kcal: number,
  weightKg: number,
  phase: Phase
): Macros {
  const protein = Math.round(weightKg * proteinPerKg(phase))
  const fatFloor = Math.round(weightKg * (phase === 'cut' ? 0.7 : 0.8))
  const proteinKcal = protein * 4
  const fatKcal = fatFloor * 9
  const remaining = Math.max(0, kcal - proteinKcal - fatKcal)
  const carbs = Math.round(remaining / 4)
  return {
    kcal,
    protein,
    fat: fatFloor,
    carbs,
  }
}

export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: round1(per100g.protein * f),
    fat: round1(per100g.fat * f),
    carbs: round1(per100g.carbs * f),
    fiber:
      per100g.fiber != null ? round1(per100g.fiber * f) : undefined,
  }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: round1(acc.protein + m.protein),
      fat: round1(acc.fat + m.fat),
      carbs: round1(acc.carbs + m.carbs),
      fiber: round1((acc.fiber ?? 0) + (m.fiber ?? 0)),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
  )
}

export function emptyMacros(): Macros {
  return { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function sexLabel(_sex: Sex): Sex {
  return _sex
}
