import { describe, expect, it } from 'vitest'
import { calcBmi, categorizeBmi, heightToCm } from './bmi'

describe('heightToCm', () => {
  it('keeps centimeters', () => {
    expect(heightToCm(175)).toBe(175)
  })

  it('converts meters under 3', () => {
    expect(heightToCm(1.75)).toBe(175)
  })
})

describe('calcBmi', () => {
  it('returns missing when weight or height absent', () => {
    expect(calcBmi(null, 175)).toEqual({ ok: false, error: 'missing' })
    expect(calcBmi(70, null)).toEqual({ ok: false, error: 'missing' })
    expect(calcBmi(0, 175)).toEqual({ ok: false, error: 'missing' })
  })

  it('returns unrealistic for out-of-range values', () => {
    expect(calcBmi(15, 175)).toEqual({ ok: false, error: 'unrealistic' })
    expect(calcBmi(70, 90)).toEqual({ ok: false, error: 'unrealistic' })
    expect(calcBmi(350, 175)).toEqual({ ok: false, error: 'unrealistic' })
  })

  it('calculates BMI rounded to 1 decimal', () => {
    const result = calcBmi(70, 175)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.bmi).toBe(22.9)
      expect(result.category).toBe('normal')
    }
  })

  it('accepts height in meters', () => {
    const result = calcBmi(70, 1.75)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.bmi).toBe(22.9)
  })
})

describe('categorizeBmi', () => {
  it('maps ranges', () => {
    expect(categorizeBmi(18.4)).toBe('underweight')
    expect(categorizeBmi(18.5)).toBe('normal')
    expect(categorizeBmi(24.9)).toBe('normal')
    expect(categorizeBmi(25)).toBe('overweight')
    expect(categorizeBmi(30)).toBe('obesity1')
    expect(categorizeBmi(35)).toBe('obesity2')
    expect(categorizeBmi(40)).toBe('obesity3')
  })
})
