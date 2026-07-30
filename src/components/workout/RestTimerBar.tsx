import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { Button } from '@/components/ui/button'

export function RestTimerBar() {
  const running = useUiStore((s) => s.restRunning)
  const left = useUiStore((s) => s.restSecondsLeft)
  const stop = useUiStore((s) => s.stopRest)
  const add = useUiStore((s) => s.addRest)
  const t = useSettingsStore((s) => s.t)

  if (!running && left <= 0) return null

  const m = Math.floor(left / 60)
  const s = left % 60
  const display = `${m}:${s.toString().padStart(2, '0')}`

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-2 shadow-lg">
      <div className="font-semibold tabular-nums text-lg">
        {t.workout.rest}: {display}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/20 text-white hover:bg-white/30 border-0"
          onClick={() => add(30)}
        >
          {t.workout.add30}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/20 text-white hover:bg-white/30 border-0"
          onClick={stop}
        >
          {t.workout.skipRest}
        </Button>
      </div>
    </div>
  )
}
