import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Pause,
  Play,
  RotateCcw,
  Save,
  Trash2,
  Volume2,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useIntervalTimer } from '@/hooks/useIntervalTimer'
import {
  createTimerPreset,
  loadTimerPresets,
  saveTimerPresets,
  type TimerPreset,
} from '@/lib/timerPresets'
import { cn } from '@/lib/cn'

function clampSec(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function TimerPanel({ embedded = false }: { embedded?: boolean }) {
  const t = useSettingsStore((s) => s.t)
  const locale = useSettingsStore((s) => s.settings.locale)
  const toast = useUiStore((s) => s.toast)

  const [workSec, setWorkSec] = useState(40)
  const [restSec, setRestSec] = useState(20)
  const [rounds, setRounds] = useState(8)
  const [prepSec, setPrepSec] = useState(5)
  const [exercisesText, setExercisesText] = useState('')
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<TimerPreset[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [vibrateEnabled, setVibrateEnabled] = useState(true)

  useEffect(() => {
    setPresets(loadTimerPresets())
  }, [])

  const exercises = useMemo(
    () =>
      exercisesText
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean),
    [exercisesText]
  )

  const timer = useIntervalTimer({
    workSec,
    restSec,
    rounds,
    prepSec,
    exercises,
    locale,
    soundEnabled,
    voiceEnabled,
    vibrateEnabled,
  })

  const phaseLabel =
    timer.phase === 'prep'
      ? t.timer.prep
      : timer.phase === 'work'
        ? t.timer.work
        : timer.phase === 'rest'
          ? t.timer.rest
          : timer.phase === 'done'
            ? t.timer.finished
            : t.timer.ready

  const phaseColor =
    timer.phase === 'work'
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
      : timer.phase === 'rest'
        ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
        : timer.phase === 'prep'
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
          : timer.phase === 'done'
            ? 'bg-primary/15 border-primary/40 text-primary'
            : 'bg-muted border-border text-muted-foreground'

  const progressIndicator =
    timer.phase === 'work'
      ? 'bg-emerald-500'
      : timer.phase === 'rest'
        ? 'bg-sky-500'
        : timer.phase === 'prep'
          ? 'bg-amber-500'
          : 'bg-primary'

  const busy = timer.phase !== 'idle' && timer.phase !== 'done'

  function applyPreset(p: TimerPreset) {
    if (busy) return
    setWorkSec(p.workSec)
    setRestSec(p.restSec)
    setRounds(p.rounds)
    setPrepSec(p.prepSec)
    setExercisesText(p.exercises.join('\n'))
    setPresetName(p.name)
    toast({ title: t.timer.presetLoaded, variant: 'success' })
  }

  function handleSavePreset() {
    const name = presetName.trim() || t.timer.untitled
    const next = createTimerPreset({
      name,
      workSec: clampSec(workSec, 1, 3600),
      restSec: clampSec(restSec, 0, 3600),
      rounds: clampSec(rounds, 1, 99),
      prepSec: clampSec(prepSec, 0, 60),
      exercises,
    })
    const list = [next, ...presets].slice(0, 40)
    setPresets(list)
    saveTimerPresets(list)
    setPresetName(name)
    toast({ title: t.timer.presetSaved, variant: 'success' })
  }

  function handleDeletePreset(id: string) {
    const list = presets.filter((p) => p.id !== id)
    setPresets(list)
    saveTimerPresets(list)
  }

  return (
    <div className={cn('space-y-4', !embedded && 'animate-fade-in')}>
      {!embedded && (
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            {t.timer.title}
          </h1>
        </header>
      )}

      {/* Active display */}
      <Card
        className={cn(
          'border-2 transition-colors',
          timer.phase === 'work' && 'border-emerald-500/50',
          timer.phase === 'rest' && 'border-sky-500/50',
          timer.phase === 'prep' && 'border-amber-500/50'
        )}
      >
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className={cn('border text-sm px-3 py-1', phaseColor)}>
              {phaseLabel}
            </Badge>
            {timer.phase !== 'idle' && timer.phase !== 'prep' && (
              <span className="text-sm text-muted-foreground">
                {t.timer.round} {Math.max(1, timer.round)} / {rounds}
              </span>
            )}
          </div>

          <div className="text-center space-y-1">
            <div className="text-6xl sm:text-7xl font-bold tabular-nums tracking-tight">
              {timer.phase === 'idle'
                ? formatMmSs(workSec)
                : formatMmSs(timer.remainingSec)}
            </div>
            {timer.exerciseName ? (
              <div className="text-base font-medium text-foreground">
                {timer.exerciseName}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {timer.phase === 'idle' ? t.timer.hint : phaseLabel}
              </div>
            )}
          </div>

          <Progress
            value={timer.phase === 'idle' ? 0 : timer.progress}
            className="h-3"
            indicatorClassName={progressIndicator}
          />

          <div className="flex flex-wrap gap-2 justify-center">
            {timer.phase === 'idle' || timer.phase === 'done' ? (
              <Button
                size="lg"
                className="min-w-[8rem]"
                onClick={() => {
                  setWorkSec(clampSec(workSec, 1, 3600))
                  setRestSec(clampSec(restSec, 0, 3600))
                  setRounds(clampSec(rounds, 1, 99))
                  setPrepSec(clampSec(prepSec, 0, 60))
                  timer.start()
                }}
              >
                <Play className="h-5 w-5" />
                {t.timer.start}
              </Button>
            ) : timer.paused ? (
              <Button size="lg" className="min-w-[8rem]" onClick={timer.resume}>
                <Play className="h-5 w-5" />
                {t.timer.resume}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                className="min-w-[8rem]"
                onClick={timer.pause}
              >
                <Pause className="h-5 w-5" />
                {t.timer.pause}
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={timer.reset}
              disabled={timer.phase === 'idle'}
            >
              <RotateCcw className="h-5 w-5" />
              {t.timer.reset}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.timer.settings}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="workSec">{t.timer.workSec}</Label>
              <Input
                id="workSec"
                type="number"
                min={1}
                max={3600}
                disabled={busy}
                value={workSec}
                onChange={(e) => setWorkSec(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="restSec">{t.timer.restSec}</Label>
              <Input
                id="restSec"
                type="number"
                min={0}
                max={3600}
                disabled={busy}
                value={restSec}
                onChange={(e) => setRestSec(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rounds">{t.timer.rounds}</Label>
              <Input
                id="rounds"
                type="number"
                min={1}
                max={99}
                disabled={busy}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prepSec">{t.timer.prepSec}</Label>
              <Input
                id="prepSec"
                type="number"
                min={0}
                max={60}
                disabled={busy}
                value={prepSec}
                onChange={(e) => setPrepSec(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="exercises">{t.timer.exercises}</Label>
            <textarea
              id="exercises"
              disabled={busy}
              value={exercisesText}
              onChange={(e) => setExercisesText(e.target.value)}
              placeholder={t.timer.exercisesHint}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="sound" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                {t.timer.sounds}
              </Label>
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="voice">{t.timer.voice}</Label>
              <Switch
                id="voice"
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="vibrate">{t.timer.vibrate}</Label>
              <Switch
                id="vibrate"
                checked={vibrateEnabled}
                onCheckedChange={setVibrateEnabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t.timer.wakeLockHint}</p>
          </div>
        </CardContent>
      </Card>

      {/* Save presets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.timer.presets}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t.timer.presetName}
              value={presetName}
              disabled={busy}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button variant="outline" onClick={handleSavePreset} disabled={busy}>
              <Save className="h-4 w-4" />
              {t.common.save}
            </Button>
          </div>
          {!presets.length ? (
            <p className="text-sm text-muted-foreground">{t.timer.noPresets}</p>
          ) : (
            <ul className="space-y-2">
              {presets.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={busy}
                    onClick={() => applyPreset(p)}
                  >
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.workSec}s / {p.restSec}s · {p.rounds}× · prep {p.prepSec}s
                    </div>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t.common.delete}
                    onClick={() => handleDeletePreset(p.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {embedded && (
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/timer" className="underline underline-offset-2">
            {t.timer.openFull}
          </Link>
        </p>
      )}
    </div>
  )
}

export function TimerPage() {
  return <TimerPanel />
}
