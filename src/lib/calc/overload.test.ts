import { describe, expect, it } from 'vitest'
import { isPersonalRecord, suggestOverload } from './overload'
import type { WorkoutSet } from '@/types'

function set(partial: Partial<WorkoutSet> & Pick<WorkoutSet, 'weight' | 'reps'>): WorkoutSet {
  return {
    id: '1',
    workoutId: 'w',
    exerciseId: 'e',
    setIndex: 0,
    isWarmup: false,
    completedAt: 1,
    ...partial,
  }
}

describe('overload', () => {
  it('suggests weight increase on easy RPE', () => {
    const s = suggestOverload([set({ weight: 100, reps: 8, rpe: 6 })], 2.5)
    expect(s?.weight).toBe(102.5)
    expect(s?.reps).toBe(8)
  })

  it('suggests rep increase on hard RPE', () => {
    const s = suggestOverload([set({ weight: 100, reps: 8, rpe: 8.5 })], 2.5)
    expect(s?.weight).toBe(100)
    expect(s?.reps).toBe(9)
  })

  it('detects personal records', () => {
    expect(isPersonalRecord('weight', 100, 95)).toBe(true)
    expect(isPersonalRecord('weight', 90, 95)).toBe(false)
    expect(isPersonalRecord('weight', 100, undefined)).toBe(true)
  })
})
