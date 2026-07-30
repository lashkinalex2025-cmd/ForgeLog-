import type { Measurement, Sex } from '@/types'
import { weightSlopeKgPerWeek } from './adaptive'

export function weightDelta(
  entries: { date: string; weightKg: number }[]
): { total: number; perWeek: number } {
  if (entries.length < 2) return { total: 0, perWeek: 0 }
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const total = sorted[sorted.length - 1].weightKg - sorted[0].weightKg
  const perWeek = weightSlopeKgPerWeek(sorted)
  return { total, perWeek }
}

/**
 * US Navy body fat estimate.
 * Requires waist, neck, height (and hips for female).
 */
export function estimateBodyFatNavy(params: {
  sex: Sex
  heightCm: number
  waistCm: number
  neckCm: number
  hipsCm?: number
}): number | null {
  const { sex, heightCm, waistCm, neckCm, hipsCm } = params
  if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return null

  if (sex === 'female') {
    if (!hipsCm || hipsCm <= 0) return null
    const v =
      495 /
        (1.29579 -
          0.35004 * Math.log10(waistCm + hipsCm - neckCm) +
          0.221 * Math.log10(heightCm)) -
      450
    return clampBf(v)
  }

  // male / other use male formula
  const v =
    495 /
      (1.0324 -
        0.19077 * Math.log10(waistCm - neckCm) +
        0.15456 * Math.log10(heightCm)) -
    450
  return clampBf(v)
}

function clampBf(v: number): number | null {
  if (!Number.isFinite(v) || v < 2 || v > 60) return null
  return Math.round(v * 10) / 10
}

export function latestMeasurement(list: Measurement[]): Measurement | undefined {
  return [...list].sort((a, b) => b.date.localeCompare(a.date))[0]
}
