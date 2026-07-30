import type { OverloadSuggestion, WorkoutSet } from '@/types'
import { roundTo } from '@/lib/units'

export function getLastWorkingSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets
    .filter((s) => !s.isWarmup && s.completedAt)
    .sort((a, b) => a.setIndex - b.setIndex)
}

export function suggestOverload(
  previousSets: WorkoutSet[],
  weightIncrement = 2.5
): OverloadSuggestion | null {
  const working = getLastWorkingSets(previousSets)
  if (working.length === 0) return null

  const top = working.reduce((best, s) =>
    s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)
      ? s
      : best
  )

  const rpe = top.rpe
  // Easy set or no RPE: push weight
  if (rpe == null || rpe <= 7) {
    return {
      weight: roundTo(top.weight + weightIncrement, weightIncrement),
      reps: top.reps,
      reason: `Прошлый раз: ${top.weight}×${top.reps}. Попробуй +${weightIncrement} кг`,
      reasonEn: `Last time: ${top.weight}×${top.reps}. Try +${weightIncrement} kg`,
    }
  }

  // Hard set: add a rep first
  if (rpe >= 8 && rpe < 9.5) {
    return {
      weight: top.weight,
      reps: top.reps + 1,
      reason: `Прошлый раз: ${top.weight}×${top.reps} @ RPE ${rpe}. +1 повтор`,
      reasonEn: `Last time: ${top.weight}×${top.reps} @ RPE ${rpe}. +1 rep`,
    }
  }

  // Very hard: hold load
  return {
    weight: top.weight,
    reps: top.reps,
    reason: `Прошлый раз тяжело (${top.weight}×${top.reps}). Повтори нагрузку`,
    reasonEn: `Last session was hard (${top.weight}×${top.reps}). Repeat load`,
  }
}

export function isPersonalRecord(
  type: 'weight' | 'volume' | 'reps',
  value: number,
  previousBest: number | undefined
): boolean {
  if (previousBest == null) return value > 0
  return value > previousBest
}
