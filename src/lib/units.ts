import type { LengthUnit, WeightUnit } from '@/types'

const KG_TO_LB = 2.2046226218
const CM_TO_IN = 0.3937007874

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * KG_TO_LB : kg
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value / KG_TO_LB : value
}

export function cmToDisplay(cm: number, unit: LengthUnit): number {
  return unit === 'in' ? cm * CM_TO_IN : cm
}

export function displayToCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value / CM_TO_IN : value
}

export function formatWeight(kg: number, unit: WeightUnit, digits = 1): string {
  const v = kgToDisplay(kg, unit)
  return `${v.toFixed(digits)} ${unit}`
}

export function formatLength(cm: number, unit: LengthUnit, digits = 1): string {
  const v = cmToDisplay(cm, unit)
  return `${v.toFixed(digits)} ${unit}`
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}
