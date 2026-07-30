import type { AdaptiveSuggestion, Phase } from '@/types'

export interface AdaptiveInput {
  avgIntakeKcal: number
  weightSlopeKgPerWeek: number
  currentWeightKg: number
  phase: Phase
  daysOfData: number
  trainingVolumePerWeek?: number
}

/**
 * MacroFactor-lite: compare weight trend vs expected for phase,
 * suggest calorie adjustment.
 */
export function suggestAdaptiveCalories(input: AdaptiveInput): AdaptiveSuggestion | null {
  const {
    avgIntakeKcal,
    weightSlopeKgPerWeek,
    currentWeightKg,
    phase,
    daysOfData,
  } = input

  if (daysOfData < 5 || avgIntakeKcal <= 0 || currentWeightKg <= 0) {
    return null
  }

  const pctPerWeek = (weightSlopeKgPerWeek / currentWeightKg) * 100
  let confidence: AdaptiveSuggestion['confidence'] =
    daysOfData >= 12 ? 'high' : daysOfData >= 8 ? 'medium' : 'low'

  // Expected weekly % change by phase
  const targets = {
    bulk: { min: 0.15, max: 0.5 },
    cut: { min: -1.0, max: -0.4 },
    maintain: { min: -0.2, max: 0.2 },
  } as const

  const t = targets[phase]
  let delta = 0
  let reason = ''
  let reasonEn = ''

  if (phase === 'bulk') {
    if (pctPerWeek < t.min) {
      delta = 150
      reason = `Набор идёт медленно (${pctPerWeek.toFixed(2)}%/нед). +150 ккал`
      reasonEn = `Slow bulk (${pctPerWeek.toFixed(2)}%/wk). +150 kcal`
    } else if (pctPerWeek > t.max) {
      delta = -100
      reason = `Вес растёт быстро (${pctPerWeek.toFixed(2)}%/нед). −100 ккал`
      reasonEn = `Fast gain (${pctPerWeek.toFixed(2)}%/wk). −100 kcal`
    } else {
      delta = 0
      reason = `Набор в целевом диапазоне (${pctPerWeek.toFixed(2)}%/нед)`
      reasonEn = `Bulk on track (${pctPerWeek.toFixed(2)}%/wk)`
    }
  } else if (phase === 'cut') {
    if (pctPerWeek > t.max) {
      delta = -150
      reason = `Сушка медленная (${pctPerWeek.toFixed(2)}%/нед). −150 ккал`
      reasonEn = `Slow cut (${pctPerWeek.toFixed(2)}%/wk). −150 kcal`
    } else if (pctPerWeek < t.min) {
      delta = 100
      reason = `Слишком быстрый дефицит (${pctPerWeek.toFixed(2)}%/нед). +100 ккал`
      reasonEn = `Cut too fast (${pctPerWeek.toFixed(2)}%/wk). +100 kcal`
    } else {
      delta = 0
      reason = `Сушка в целевом диапазоне (${pctPerWeek.toFixed(2)}%/нед)`
      reasonEn = `Cut on track (${pctPerWeek.toFixed(2)}%/wk)`
    }
  } else {
    if (pctPerWeek > t.max) {
      delta = -100
      reason = `Вес растёт (${pctPerWeek.toFixed(2)}%/нед). −100 ккал`
      reasonEn = `Weight creeping up (${pctPerWeek.toFixed(2)}%/wk). −100 kcal`
    } else if (pctPerWeek < t.min) {
      delta = 100
      reason = `Вес падает (${pctPerWeek.toFixed(2)}%/нед). +100 ккал`
      reasonEn = `Weight dropping (${pctPerWeek.toFixed(2)}%/wk). +100 kcal`
    } else {
      delta = 0
      reason = `Вес стабилен (${pctPerWeek.toFixed(2)}%/нед)`
      reasonEn = `Weight stable (${pctPerWeek.toFixed(2)}%/wk)`
    }
  }

  // Mild volume bump if training heavy during cut
  if (
    phase === 'cut' &&
    (input.trainingVolumePerWeek ?? 0) > 50000 &&
    delta < 0
  ) {
    delta = Math.min(delta + 50, 0)
  }

  return {
    suggestedKcal: Math.round(avgIntakeKcal + delta),
    delta,
    reason,
    reasonEn,
    confidence,
  }
}

/** Simple linear regression slope for weight (kg per week). */
export function weightSlopeKgPerWeek(
  points: { date: string; weightKg: number }[]
): number {
  if (points.length < 2) return 0
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const t0 = new Date(sorted[0].date).getTime()
  const xs = sorted.map((p) => (new Date(p.date).getTime() - t0) / (7 * 86400000))
  const ys = sorted.map((p) => p.weightKg)
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return 0
  return num / den
}
