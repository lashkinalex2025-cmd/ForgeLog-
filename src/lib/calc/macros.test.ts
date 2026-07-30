import { describe, expect, it } from 'vitest'
import {
  calcBmr,
  calcMacroSplit,
  calcTdee,
  phaseCalorieTarget,
  scaleMacros,
  sumMacros,
} from './macros'

describe('macros', () => {
  const profile = {
    name: 'Test',
    sex: 'male' as const,
    age: 28,
    heightCm: 180,
    activity: 'moderate' as const,
  }

  it('calculates BMR in reasonable range', () => {
    const bmr = calcBmr(profile, 80)
    expect(bmr).toBeGreaterThan(1500)
    expect(bmr).toBeLessThan(2200)
  })

  it('calculates TDEE higher than BMR', () => {
    expect(calcTdee(profile, 80)).toBeGreaterThan(calcBmr(profile, 80))
  })

  it('applies phase calorie targets', () => {
    expect(phaseCalorieTarget(2500, 'bulk')).toBe(2750)
    expect(phaseCalorieTarget(2500, 'cut')).toBe(2100)
    expect(phaseCalorieTarget(2500, 'maintain')).toBe(2500)
  })

  it('splits macros with protein priority', () => {
    const m = calcMacroSplit(2500, 80, 'cut')
    expect(m.protein).toBe(Math.round(80 * 2.2))
    expect(m.kcal).toBe(2500)
    expect(m.fat + m.carbs + m.protein).toBeGreaterThan(0)
  })

  it('scales macros by grams', () => {
    const m = scaleMacros({ kcal: 100, protein: 10, fat: 5, carbs: 8 }, 50)
    expect(m.kcal).toBe(50)
    expect(m.protein).toBe(5)
  })

  it('sums macros', () => {
    const s = sumMacros([
      { kcal: 100, protein: 10, fat: 2, carbs: 5 },
      { kcal: 200, protein: 20, fat: 4, carbs: 10 },
    ])
    expect(s.kcal).toBe(300)
    expect(s.protein).toBe(30)
  })
})
