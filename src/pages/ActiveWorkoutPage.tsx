import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronDown, ChevronUp, Minus, Plus, Search, Trophy } from 'lucide-react'
import { db } from '@/db'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { kgToDisplay, displayToKg, formatWeight, roundTo } from '@/lib/units'
import { exerciseVolume, setVolume } from '@/lib/calc/volume'
import { suggestOverload, isPersonalRecord } from '@/lib/calc/overload'
import { todayKey, uid } from '@/lib/dates'
import type { Exercise, PersonalRecord, WorkoutSet } from '@/types'
import { cn } from '@/lib/cn'

const EMPTY_SETS: WorkoutSet[] = []
const EMPTY_EX: Exercise[] = []
const EMPTY_PRS: PersonalRecord[] = []

function parseExerciseIds(notes?: string): string[] {
  if (!notes) return []
  try {
    const j = JSON.parse(notes)
    return Array.isArray(j.exerciseIds) ? j.exerciseIds : []
  } catch {
    return []
  }
}

export function ActiveWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useSettingsStore((s) => s.t)
  const settings = useSettingsStore((s) => s.settings)
  const toast = useUiStore((s) => s.toast)
  const startRest = useUiStore((s) => s.startRest)

  // null = not found / no id; undefined = still loading
  const workout = useLiveQuery(async () => {
    if (!id) return null
    const w = await db.workouts.get(id)
    return w ?? null
  }, [id])
  const sets =
    useLiveQuery(
      () => (id ? db.sets.where('workoutId').equals(id).toArray() : Promise.resolve(EMPTY_SETS)),
      [id],
      EMPTY_SETS
    ) ?? EMPTY_SETS
  const exercises =
    useLiveQuery(() => db.exercises.toArray(), [], EMPTY_EX) ?? EMPTY_EX
  const prs =
    useLiveQuery(() => db.personalRecords.toArray(), [], EMPTY_PRS) ?? EMPTY_PRS

  const [exerciseIds, setExerciseIds] = useState<string[]>([])
  const [activeEx, setActiveEx] = useState<string | null>(null)
  const [weight, setWeight] = useState(60)
  const [reps, setReps] = useState(8)
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [isWarmup, setIsWarmup] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')

  useEffect(() => {
    if (workout === null) {
      navigate('/workout', { replace: true })
    }
  }, [workout, navigate])

  useEffect(() => {
    if (!workout) return
    const ids = parseExerciseIds(workout.notes)
    setExerciseIds(ids)
    setActiveEx((prev) => prev ?? ids[0] ?? null)
  }, [workout])

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  )

  const currentExercise = activeEx ? exerciseMap.get(activeEx) : undefined
  const currentSets = useMemo(
    () =>
      sets
        .filter((s) => s.exerciseId === activeEx)
        .sort((a, b) => a.setIndex - b.setIndex),
    [sets, activeEx]
  )

  const prevSessionSets = useLiveQuery(async () => {
    if (!activeEx || !id) return EMPTY_SETS
    // Order by date (status index alone has no chronological order)
    const past = await db.workouts.where('status').equals('done').toArray()
    past.sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.finishedAt ?? b.startedAt ?? 0) - (a.finishedAt ?? a.startedAt ?? 0)
    )
    for (const w of past) {
      if (w.id === id) continue
      // Avoid compound where() without [workoutId+exerciseId] index
      const s = await db.sets
        .where('workoutId')
        .equals(w.id)
        .filter((set) => set.exerciseId === activeEx)
        .toArray()
      if (s.length) return s
    }
    return EMPTY_SETS
  }, [activeEx, id])

  const overload = useMemo(
    () => suggestOverload(prevSessionSets ?? EMPTY_SETS, settings.weightIncrement),
    [prevSessionSets, settings.weightIncrement]
  )

  useEffect(() => {
    if (overload && currentSets.length === 0) {
      setWeight(kgToDisplay(overload.weight, settings.weightUnit))
      setReps(overload.reps)
    } else if (currentSets.length) {
      const last = currentSets[currentSets.length - 1]
      setWeight(kgToDisplay(last.weight, settings.weightUnit))
      setReps(last.reps)
    }
    // Intentionally only re-seed inputs when exercise or overload suggestion changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSets derived from activeEx
  }, [activeEx, overload?.weight, overload?.reps, settings.weightUnit])

  const totalVol = exerciseVolume(sets.filter((s) => s.completedAt))

  async function persistExerciseIds(ids: string[]) {
    setExerciseIds(ids)
    if (id) {
      await db.workouts.update(id, {
        notes: JSON.stringify({ exerciseIds: ids }),
      })
    }
  }

  async function addExercise(ex: Exercise) {
    if (exerciseIds.includes(ex.id)) {
      setActiveEx(ex.id)
      setPickerOpen(false)
      return
    }
    const next = [...exerciseIds, ex.id]
    await persistExerciseIds(next)
    setActiveEx(ex.id)
    setPickerOpen(false)
  }

  async function completeSet() {
    if (!id || !activeEx) return
    const weightKg = displayToKg(weight, settings.weightUnit)
    const setIndex = currentSets.length
    const setId = uid('set-')
    const completedAt = Date.now()
    const set: WorkoutSet = {
      id: setId,
      workoutId: id,
      exerciseId: activeEx,
      setIndex,
      weight: weightKg,
      reps,
      rpe,
      isWarmup,
      completedAt,
    }
    await db.sets.add(set)

    // PR check
    if (!isWarmup) {
      const vol = setVolume(set)
      const bestWeight = prs
        .filter((p) => p.exerciseId === activeEx && p.type === 'weight')
        .map((p) => p.value)
      const prevBest = bestWeight.length ? Math.max(...bestWeight) : undefined
      if (isPersonalRecord('weight', weightKg, prevBest)) {
        await db.personalRecords.add({
          id: uid('pr-'),
          exerciseId: activeEx,
          type: 'weight',
          value: weightKg,
          date: todayKey(),
          setId,
          createdAt: Date.now(),
        })
        toast({
          title: `🏆 ${t.workout.pr}`,
          description: formatWeight(weightKg, settings.weightUnit),
          variant: 'success',
        })
      } else {
        toast({
          title: `✓ ${t.workout.set} ${setIndex + 1}`,
          description: `${formatWeight(weightKg, settings.weightUnit)} × ${reps}`,
          variant: 'success',
        })
      }
      void vol
    }

    if (!isWarmup) {
      startRest(settings.restTimerDefault)
    }
    setIsWarmup(false)
  }

  async function finishWorkout() {
    if (!id) return
    await db.workouts.update(id, {
      status: 'done',
      finishedAt: Date.now(),
    })
    toast({ title: t.workout.finish, variant: 'success' })
    navigate('/workout')
  }

  const step = settings.weightIncrement
  const displayStep =
    settings.weightUnit === 'lb' ? roundTo(step * 2.20462, 0.5) || 5 : step

  if (workout === undefined || workout === null) {
    return (
      <div className="py-20 text-center text-muted-foreground">{t.common.loading}</div>
    )
  }

  const filteredPicker = exercises.filter((e) => {
    const q = pickerQuery.toLowerCase()
    if (!q) return true
    return e.name.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      <header className="flex items-start justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-bold leading-tight">{workout.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.workout.volume}: {Math.round(totalVol)}
          </p>
        </div>
        <Button variant="outline" onClick={finishWorkout}>
          {t.workout.finish}
        </Button>
      </header>

      {/* Exercise chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {exerciseIds.map((eid) => {
          const ex = exerciseMap.get(eid)
          if (!ex) return null
          return (
            <Button
              key={eid}
              size="sm"
              variant={activeEx === eid ? 'default' : 'outline'}
              className="shrink-0"
              onClick={() => setActiveEx(eid)}
            >
              {settings.locale === 'ru' ? ex.name : ex.nameEn}
            </Button>
          )
        })}
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.workout.addExercise}
        </Button>
      </div>

      {currentExercise ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {settings.locale === 'ru'
                  ? currentExercise.name
                  : currentExercise.nameEn}
              </CardTitle>
              {overload && (
                <div className="text-sm text-primary flex items-start gap-2 mt-1">
                  <Trophy className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {t.workout.overload}:{' '}
                    {settings.locale === 'ru' ? overload.reason : overload.reasonEn}
                  </span>
                </div>
              )}
              {(prevSessionSets?.length ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.workout.previous}:{' '}
                  {(prevSessionSets ?? [])
                    .filter((s) => !s.isWarmup)
                    .map(
                      (s) =>
                        `${formatWeight(s.weight, settings.weightUnit, 1)}×${s.reps}`
                    )
                    .join(' · ')}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Weight control */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 text-center">
                  {t.workout.weight} ({settings.weightUnit})
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-16 w-16 rounded-2xl text-2xl"
                    onClick={() =>
                      setWeight((w) => Math.max(0, roundTo(w - displayStep, displayStep)))
                    }
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="h-16 w-28 text-center text-3xl font-bold tabular-nums"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value) || 0)}
                  />
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-16 w-16 rounded-2xl"
                    onClick={() =>
                      setWeight((w) => roundTo(w + displayStep, displayStep))
                    }
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {/* Reps */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 text-center">
                  {t.workout.reps}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-16 w-16 rounded-2xl"
                    onClick={() => setReps((r) => Math.max(1, r - 1))}
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="numeric"
                    className="h-16 w-28 text-center text-3xl font-bold tabular-nums"
                    value={reps}
                    onChange={(e) => setReps(Number(e.target.value) || 0)}
                  />
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-16 w-16 rounded-2xl"
                    onClick={() => setReps((r) => r + 1)}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                RPE / {t.workout.warmup}
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {[6, 7, 8, 9, 10].map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={rpe === v ? 'default' : 'outline'}
                        onClick={() => setRpe(rpe === v ? undefined : v)}
                      >
                        RPE {v}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant={isWarmup ? 'secondary' : 'outline'}
                    className={cn(isWarmup && 'bg-warning text-warning-foreground hover:bg-warning/90')}
                    onClick={() => setIsWarmup((v) => !v)}
                  >
                    {t.workout.warmup}
                  </Button>
                </div>
              )}

              <Button size="xl" className="w-full" onClick={completeSet}>
                <Check className="h-6 w-6" />
                {t.workout.completeSet}
              </Button>
            </CardContent>
          </Card>

          {/* Logged sets */}
          {currentSets.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {currentSets.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-sm rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      #{s.setIndex + 1}
                      {s.isWarmup ? ` · ${t.workout.warmup}` : ''}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatWeight(s.weight, settings.weightUnit)} × {s.reps}
                      {s.rpe != null ? ` @${s.rpe}` : ''}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">{t.workout.addExercise}</p>
            <Button onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.workout.addExercise}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.workout.addExercise}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder={t.common.search}
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filteredPicker.slice(0, 50).map((e) => (
              <button
                key={e.id}
                type="button"
                className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-muted"
                onClick={() => addExercise(e)}
              >
                <div className="font-medium text-sm">
                  {settings.locale === 'ru' ? e.name : e.nameEn}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.muscles[e.primaryMuscle]}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
