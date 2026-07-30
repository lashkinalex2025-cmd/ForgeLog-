import { useEffect } from 'react'
import { useUiStore } from '@/stores/uiStore'

export function useRestTimerTicker() {
  const running = useUiStore((s) => s.restRunning)
  const tick = useUiStore((s) => s.tickRest)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => tick(), 1000)
    return () => clearInterval(id)
  }, [running, tick])
}
