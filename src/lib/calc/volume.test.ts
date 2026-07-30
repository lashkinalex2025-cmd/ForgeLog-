import { describe, expect, it } from 'vitest'
import { emptyMuscleVolume, exerciseVolume, muscleVolumeFromSets, setVolume } from './volume'
import type { Exercise, WorkoutSet } from '@/types'

describe('volume', () => {
  it('ignores warmup sets', () => {
    expect(setVolume({ weight: 100, reps: 5, isWarmup: true })).toBe(0)
    expect(setVolume({ weight: 100, reps: 5, isWarmup: false })).toBe(500)
  })

  it('sums exercise volume', () => {
    const sets = [
      { weight: 100, reps: 5, isWarmup: false },
      { weight: 100, reps: 5, isWarmup: false },
      { weight: 60, reps: 10, isWarmup: true },
    ] as WorkoutSet[]
    expect(exerciseVolume(sets)).toBe(1000)
  })

  it('attributes secondary muscles at 50%', () => {
    const exercises = new Map<string, Exercise>([
      [
        'e1',
        {
          id: 'e1',
          name: 'Bench',
          nameEn: 'Bench',
          primaryMuscle: 'chest',
          secondaryMuscles: ['triceps'],
          equipment: 'barbell',
          isCustom: false,
        },
      ],
    ])
    const sets: WorkoutSet[] = [
      {
        id: '1',
        workoutId: 'w',
        exerciseId: 'e1',
        setIndex: 0,
        weight: 100,
        reps: 5,
        isWarmup: false,
        completedAt: 1,
      },
    ]
    const vol = muscleVolumeFromSets(sets, exercises)
    expect(vol.chest).toBe(500)
    expect(vol.triceps).toBe(250)
    expect(emptyMuscleVolume().chest).toBe(0)
  })
})
