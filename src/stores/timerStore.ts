import { create } from 'zustand'
import {
  playTimerSound,
  speakText,
  vibratePattern,
} from '@/lib/timerAudio'

export type TimerPhase = 'idle' | 'prep' | 'work' | 'rest' | 'done'

export interface IntervalTimerConfig {
  workSec: number
  restSec: number
  rounds: number
  prepSec: number
  exercises: string[]
  locale: 'ru' | 'en'
  soundEnabled: boolean
  voiceEnabled: boolean
  vibrateEnabled: boolean
}

interface TimerState {
  phase: TimerPhase
  round: number
  phaseEndsAt: number
  phaseDurationSec: number
  remainingSec: number
  paused: boolean
  pausedLeftMs: number
  exerciseName: string
  config: IntervalTimerConfig | null
  warned: boolean
  start: (config: IntervalTimerConfig) => void
  pause: () => void
  resume: () => void
  reset: () => void
  tick: () => void
}

const idleFields = {
  phase: 'idle' as TimerPhase,
  round: 0,
  phaseEndsAt: 0,
  phaseDurationSec: 0,
  remainingSec: 0,
  paused: false,
  pausedLeftMs: 0,
  exerciseName: '',
  warned: false,
}

let wakeLock: WakeLockSentinel | null = null

async function releaseWakeLock() {
  try {
    await wakeLock?.release()
  } catch {
    /* ignore */
  }
  wakeLock = null
}

async function requestWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return
    await releaseWakeLock()
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
  } catch {
    /* unsupported */
  }
}

function exerciseForRound(exercises: string[], round: number): string {
  if (!exercises.length) return ''
  return exercises[(round - 1) % exercises.length] ?? ''
}

function announce(cfg: IntervalTimerConfig, phase: TimerPhase, round: number) {
  const name = exerciseForRound(cfg.exercises, round)
  if (cfg.soundEnabled) {
    void playTimerSound(phase === 'done' ? 'end' : phase === 'prep' ? 'start' : 'phase')
  }
  if (cfg.vibrateEnabled) {
    if (phase === 'done') vibratePattern([200, 80, 200, 80, 300])
    else if (phase === 'work') vibratePattern(120)
    else vibratePattern(60)
  }
  if (cfg.voiceEnabled && phase === 'work' && name) {
    speakText(name, cfg.locale)
  } else if (cfg.voiceEnabled && phase === 'prep') {
    speakText(cfg.locale === 'ru' ? 'Приготовьтесь' : 'Get ready', cfg.locale)
  } else if (cfg.voiceEnabled && phase === 'done') {
    speakText(cfg.locale === 'ru' ? 'Готово' : 'Done', cfg.locale)
  } else if (cfg.voiceEnabled && phase === 'rest') {
    speakText(cfg.locale === 'ru' ? 'Отдых' : 'Rest', cfg.locale)
  }
}

function safeWork(cfg: IntervalTimerConfig) {
  return Number.isFinite(cfg.workSec) ? Math.max(1, Math.floor(cfg.workSec)) : 40
}
function safeRest(cfg: IntervalTimerConfig) {
  return Number.isFinite(cfg.restSec) ? Math.max(0, Math.floor(cfg.restSec)) : 20
}
function safePrep(cfg: IntervalTimerConfig) {
  return Number.isFinite(cfg.prepSec) ? Math.max(0, Math.floor(cfg.prepSec)) : 0
}
function safeRounds(cfg: IntervalTimerConfig) {
  return Number.isFinite(cfg.rounds) ? Math.max(1, Math.floor(cfg.rounds)) : 1
}

export const useTimerStore = create<TimerState>((set, get) => {
  const enterPhase = (phase: TimerPhase, round: number) => {
    const cfg = get().config
    if (!cfg) return

    const work = safeWork(cfg)
    const rest = safeRest(cfg)
    const prep = safePrep(cfg)
    const rounds = safeRounds(cfg)
    let duration = 0
    if (phase === 'prep') duration = prep
    else if (phase === 'work') duration = work
    else if (phase === 'rest') duration = rest

    const name = exerciseForRound(cfg.exercises, round)

    if (phase === 'rest' && duration <= 0) {
      const nextRound = round + 1
      if (nextRound > rounds) {
        announce(cfg, 'done', round)
        void releaseWakeLock()
        set({ ...idleFields, phase: 'done', round, exerciseName: name, config: cfg })
        return
      }
      enterPhase('work', nextRound)
      return
    }
    if (phase === 'prep' && duration <= 0) {
      enterPhase('work', 1)
      return
    }
    if (phase === 'done') {
      announce(cfg, 'done', round)
      void releaseWakeLock()
      set({ ...idleFields, phase: 'done', round, exerciseName: name, config: cfg })
      return
    }

    announce(cfg, phase, round)
    void requestWakeLock()
    set({
      phase,
      round,
      phaseEndsAt: Date.now() + duration * 1000,
      phaseDurationSec: duration,
      remainingSec: duration,
      paused: false,
      pausedLeftMs: 0,
      exerciseName: name,
      warned: false,
    })
  }

  const advanceFrom = (phase: TimerPhase, round: number) => {
    const cfg = get().config
    if (!cfg) return
    const rounds = safeRounds(cfg)
    if (phase === 'prep') {
      enterPhase('work', 1)
      return
    }
    if (phase === 'work') {
      if (round >= rounds) {
        enterPhase('done', round)
        return
      }
      enterPhase('rest', round)
      return
    }
    if (phase === 'rest') {
      enterPhase('work', round + 1)
    }
  }

  return {
    ...idleFields,
    config: null,

    start: (config) => {
      const normalized: IntervalTimerConfig = {
        ...config,
        workSec: safeWork(config),
        restSec: safeRest(config),
        rounds: safeRounds(config),
        prepSec: safePrep(config),
      }
      set({ config: normalized, ...idleFields })
      if (normalized.prepSec > 0) enterPhase('prep', 0)
      else enterPhase('work', 1)
    },

    pause: () => {
      const s = get()
      if (s.phase === 'idle' || s.phase === 'done' || s.paused) return
      const left = Math.max(0, s.phaseEndsAt - Date.now())
      set({
        paused: true,
        pausedLeftMs: left,
        remainingSec: Math.ceil(left / 1000),
      })
    },

    resume: () => {
      const s = get()
      if (!s.paused) return
      void requestWakeLock()
      set({
        paused: false,
        phaseEndsAt: Date.now() + s.pausedLeftMs,
        remainingSec: Math.ceil(s.pausedLeftMs / 1000),
        pausedLeftMs: 0,
      })
    },

    reset: () => {
      void releaseWakeLock()
      set({ ...idleFields, config: null })
    },

    tick: () => {
      const s = get()
      if (s.paused || s.phase === 'idle' || s.phase === 'done' || !s.config) return
      const leftMs = s.phaseEndsAt - Date.now()
      const leftSec = Math.max(0, Math.ceil(leftMs / 1000))

      if (
        leftSec === 3 &&
        !s.warned &&
        (s.phase === 'work' || s.phase === 'rest' || s.phase === 'prep')
      ) {
        set({ warned: true })
        if (s.config.soundEnabled) void playTimerSound('warn')
        if (s.config.vibrateEnabled) vibratePattern(40)
      }

      if (leftMs <= 0) {
        advanceFrom(s.phase, s.round)
        return
      }
      if (leftSec !== s.remainingSec) {
        set({ remainingSec: leftSec })
      }
    },
  }
})

export function getTimerProgress(state: {
  phase: TimerPhase
  phaseDurationSec: number
  remainingSec: number
}): number {
  if (state.phase === 'idle' || state.phaseDurationSec <= 0) return 0
  return Math.min(
    100,
    Math.max(
      0,
      ((state.phaseDurationSec - state.remainingSec) / state.phaseDurationSec) * 100
    )
  )
}
