import { describe, expect, it } from 'vitest'
import { suggestAdaptiveCalories, weightSlopeKgPerWeek } from './adaptive'

describe('adaptive calories', () => {
  it('computes positive slope for gaining weight', () => {
    const slope = weightSlopeKgPerWeek([
      { date: '2026-01-01', weightKg: 80 },
      { date: '2026-01-08', weightKg: 80.5 },
      { date: '2026-01-15', weightKg: 81 },
    ])
    expect(slope).toBeGreaterThan(0.4)
    expect(slope).toBeLessThan(0.6)
  })

  it('suggests more calories when bulk is too slow', () => {
    const s = suggestAdaptiveCalories({
      avgIntakeKcal: 3000,
      weightSlopeKgPerWeek: 0.05,
      currentWeightKg: 80,
      phase: 'bulk',
      daysOfData: 14,
    })
    expect(s).not.toBeNull()
    expect(s!.delta).toBeGreaterThan(0)
  })

  it('returns null with insufficient data', () => {
    expect(
      suggestAdaptiveCalories({
        avgIntakeKcal: 2000,
        weightSlopeKgPerWeek: 0,
        currentWeightKg: 80,
        phase: 'cut',
        daysOfData: 2,
      })
    ).toBeNull()
  })
})
