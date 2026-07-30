import type { Exercise, MuscleGroup, WorkoutSet } from '@/types'
import { MUSCLE_GROUPS } from '@/types'

export function setVolume(set: Pick<WorkoutSet, 'weight' | 'reps' | 'isWarmup'>): number {
  if (set.isWarmup) return 0
  return set.weight * set.reps
}

export function exerciseVolume(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0)
}

export function totalVolume(sets: WorkoutSet[]): number {
  return exerciseVolume(sets)
}

/** Attribute volume: primary = 100%, each secondary = 50% */
export function muscleVolumeFromSets(
  sets: WorkoutSet[],
  exercises: Map<string, Exercise>
): Record<MuscleGroup, number> {
  const result = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<
    MuscleGroup,
    number
  >

  for (const set of sets) {
    if (set.isWarmup || !set.completedAt) continue
    const ex = exercises.get(set.exerciseId)
    if (!ex) continue
    const vol = setVolume(set)
    result[ex.primaryMuscle] += vol
    for (const sec of ex.secondaryMuscles) {
      result[sec] += vol * 0.5
    }
  }

  return result
}

export function emptyMuscleVolume(): Record<MuscleGroup, number> {
  return Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<
    MuscleGroup,
    number
  >
}

export function maxMuscleVolume(
  map: Record<MuscleGroup, number>
): number {
  return Math.max(1, ...Object.values(map))
}
