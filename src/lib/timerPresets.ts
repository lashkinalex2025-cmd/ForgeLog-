import { uid } from '@/lib/dates'

const STORAGE_KEY = 'forgelog-timer-presets-v1'

export interface TimerPreset {
  id: string
  name: string
  workSec: number
  restSec: number
  rounds: number
  prepSec: number
  /** Exercise titles announced at the start of each work round (cycles if fewer than rounds). */
  exercises: string[]
  createdAt: number
}

export function loadTimerPresets(): TimerPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TimerPreset[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.workSec === 'number'
    )
  } catch {
    return []
  }
}

export function saveTimerPresets(presets: TimerPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    /* ignore quota */
  }
}

export function createTimerPreset(
  input: Omit<TimerPreset, 'id' | 'createdAt'>
): TimerPreset {
  return {
    ...input,
    id: uid('tp-'),
    createdAt: Date.now(),
  }
}
