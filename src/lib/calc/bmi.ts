export type BmiCategoryId =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obesity1'
  | 'obesity2'
  | 'obesity3'

export type BmiErrorCode = 'missing' | 'unrealistic'

export interface BmiSuccess {
  ok: true
  bmi: number
  category: BmiCategoryId
}

export interface BmiFailure {
  ok: false
  error: BmiErrorCode
}

export type BmiResult = BmiSuccess | BmiFailure

/** Normalize height to centimeters. Values under 3 are treated as meters. */
export function heightToCm(height: number): number {
  if (!Number.isFinite(height) || height <= 0) return NaN
  return height < 3 ? height * 100 : height
}

export function calcBmi(weightKg: number | null | undefined, height: number | null | undefined): BmiResult {
  if (
    weightKg == null ||
    height == null ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(height) ||
    weightKg <= 0 ||
    height <= 0
  ) {
    return { ok: false, error: 'missing' }
  }

  const heightCm = heightToCm(height)
  if (
    weightKg < 20 ||
    weightKg > 300 ||
    heightCm < 100 ||
    heightCm > 250
  ) {
    return { ok: false, error: 'unrealistic' }
  }

  const heightM = heightCm / 100
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10

  return { ok: true, bmi, category: categorizeBmi(bmi) }
}

export function categorizeBmi(bmi: number): BmiCategoryId {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  if (bmi < 35) return 'obesity1'
  if (bmi < 40) return 'obesity2'
  return 'obesity3'
}
