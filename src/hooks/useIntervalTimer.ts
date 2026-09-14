import { useCallback, useEffect, useRef, useState } from 'react'
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

interface RuntimeState {
  phase: TimerPhase
  round: number
  /** Absolute timestamp when current phase ends (ms). */
  phaseEndsAt: number
  /** Full duration of current phase (sec) for progress bar. */
  phaseDurationSec: number
  remainingSec: number
  paused: boolean
  /** Remaining ms when paused. */
  pausedLeftMs: number
  exerciseName: string
}

const IDLE: RuntimeState = {
  phase: 'idle',
  round: 0,
  phaseEndsAt: 0,
  phaseDurationSec: 0,
  remainingSec: 0,
  paused: false,
  pausedLeftMs: 0,
  exerciseName: '',
}

function exerciseForRound(exercises: string[], round: number): string {
  if (!exercises.length) return ''
  return exercises[(round - 1) % exercises.length] ?? ''
}

export function useIntervalTimer(config: IntervalTimerConfig) {
  const [state, setState] = useState<RuntimeState>(IDLE)
  const configRef = useRef(config)
  configRef.current = config
  const warnedRef = useRef(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release()
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null
  }, [])

  const requestWakeLock = useCallback(async () => {
    try {
      if (!('wakeLock' in navigator)) return
      await releaseWakeLock()
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null
      })
    } catch {
      /* unsupported / denied */
    }
  }, [releaseWakeLock])

  const announce = useCallback((phase: TimerPhase, round: number) => {
    const cfg = configRef.current
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
  }, [])

  const enterPhase = useCallback(
    (phase: TimerPhase, round: number) => {
      const cfg = configRef.current
      const work = Number.isFinite(cfg.workSec) ? Math.max(1, Math.floor(cfg.workSec)) : 40
      const rest = Number.isFinite(cfg.restSec) ? Math.max(0, Math.floor(cfg.restSec)) : 20
      const prep = Number.isFinite(cfg.prepSec) ? Math.max(0, Math.floor(cfg.prepSec)) : 0
      let duration = 0
      if (phase === 'prep') duration = prep
      else if (phase === 'work') duration = work
      else if (phase === 'rest') duration = rest
      else duration = 0

      warnedRef.current = false
      const name = exerciseForRound(cfg.exercises, round)

      if (phase === 'done' || duration <= 0) {
        if (phase === 'rest' && duration <= 0) {
          // skip empty rest
          const nextRound = round + 1
          if (nextRound > cfg.rounds) {
            announce('done', round)
            void releaseWakeLock()
            setState({
              ...IDLE,
              phase: 'done',
              round,
              exerciseName: name,
            })
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
          announce('done', round)
          void releaseWakeLock()
          setState({
            ...IDLE,
            phase: 'done',
            round,
            exerciseName: name,
          })
          return
        }
      }

      announce(phase, round)
      void requestWakeLock()
      const endsAt = Date.now() + duration * 1000
      setState({
        phase,
        round,
        phaseEndsAt: endsAt,
        phaseDurationSec: duration,
        remainingSec: duration,
        paused: false,
        pausedLeftMs: 0,
        exerciseName: name,
      })
    },
    [announce, releaseWakeLock, requestWakeLock]
  )

  const advanceFrom = useCallback(
    (phase: TimerPhase, round: number) => {
      const cfg = configRef.current
      if (phase === 'prep') {
        enterPhase('work', 1)
        return
      }
      if (phase === 'work') {
        if (round >= cfg.rounds) {
          enterPhase('done', round)
          return
        }
        enterPhase('rest', round)
        return
      }
      if (phase === 'rest') {
        enterPhase('work', round + 1)
      }
    },
    [enterPhase]
  )

  const start = useCallback(() => {
    const cfg = configRef.current
    const rounds = Math.max(1, Math.floor(cfg.rounds) || 1)
    configRef.current = { ...cfg, rounds }
    if (cfg.prepSec > 0) enterPhase('prep', 0)
    else enterPhase('work', 1)
  }, [enterPhase])

  const pause = useCallback(() => {
    setState((s) => {
      if (s.phase === 'idle' || s.phase === 'done' || s.paused) return s
      const left = Math.max(0, s.phaseEndsAt - Date.now())
      return { ...s, paused: true, pausedLeftMs: left, remainingSec: Math.ceil(left / 1000) }
    })
  }, [])

  const resume = useCallback(() => {
    void requestWakeLock()
    setState((s) => {
      if (!s.paused) return s
      const endsAt = Date.now() + s.pausedLeftMs
      return {
        ...s,
        paused: false,
        phaseEndsAt: endsAt,
        remainingSec: Math.ceil(s.pausedLeftMs / 1000),
        pausedLeftMs: 0,
      }
    })
  }, [requestWakeLock])

  const reset = useCallback(() => {
    void releaseWakeLock()
    warnedRef.current = false
    setState(IDLE)
  }, [releaseWakeLock])

  // Tick + background-safe sync via wall clock
  useEffect(() => {
    const { phase, paused } = state
    if (phase === 'idle' || phase === 'done' || paused) return

    const tick = () => {
      const s = stateRef.current
      if (s.paused || s.phase === 'idle' || s.phase === 'done') return
      const leftMs = s.phaseEndsAt - Date.now()
      const leftSec = Math.max(0, Math.ceil(leftMs / 1000))

      if (
        leftSec === 3 &&
        !warnedRef.current &&
        (s.phase === 'work' || s.phase === 'rest' || s.phase === 'prep')
      ) {
        warnedRef.current = true
        const cfg = configRef.current
        if (cfg.soundEnabled) void playTimerSound('warn')
        if (cfg.vibrateEnabled) vibratePattern(40)
      }

      if (leftMs <= 0) {
        advanceFrom(s.phase, s.round)
        return
      }
      if (leftSec !== s.remainingSec) {
        setState((prev) =>
          prev.phase === s.phase && !prev.paused
            ? { ...prev, remainingSec: leftSec }
            : prev
        )
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        tick()
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [state.phase, state.paused, advanceFrom, requestWakeLock])

  useEffect(() => () => {
    void releaseWakeLock()
  }, [releaseWakeLock])

  const progress =
    state.phaseDurationSec > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((state.phaseDurationSec - state.remainingSec) / state.phaseDurationSec) *
              100
          )
        )
      : 0

  return {
    ...state,
    progress,
    start,
    pause,
    resume,
    reset,
    isRunning:
      state.phase !== 'idle' && state.phase !== 'done' && !state.paused,
  }
}
