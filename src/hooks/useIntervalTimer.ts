import { useEffect } from 'react'
import { useTimerStore } from '@/stores/timerStore'

/** Keep the global interval timer ticking while the app is open. */
export function useIntervalTimerTicker() {
  const phase = useTimerStore((s) => s.phase)
  const paused = useTimerStore((s) => s.paused)
  const tick = useTimerStore((s) => s.tick)

  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || paused) return
    const id = window.setInterval(() => tick(), 250)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [phase, paused, tick])
}
