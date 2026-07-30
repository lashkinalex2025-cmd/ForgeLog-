import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Dumbbell,
  Plus,
  Scale,
  Sparkles,
  Utensils,
} from 'lucide-react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '@/db'
import { useSettingsStore } from '@/stores/settingsStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MacroProgress } from '@/components/common/MacroProgress'
import { Badge } from '@/components/ui/badge'
import { emptyMacros, sumMacros } from '@/lib/calc/macros'
import { lastNDaysKeys, todayKey, formatShortDate } from '@/lib/dates'
import { formatWeight } from '@/lib/units'
import { muscleVolumeFromSets, maxMuscleVolume } from '@/lib/calc/volume'
import { suggestAdaptiveCalories, weightSlopeKgPerWeek } from '@/lib/calc/adaptive'
import {
  MUSCLE_GROUPS,
  type BodyWeight,
  type Exercise,
  type Meal,
  type MuscleGroup,
  type WaterLog,
  type Workout,
  type WorkoutSet,
} from '@/types'
import { cn } from '@/lib/cn'

const EMPTY_MEALS: Meal[] = []
const EMPTY_WATER: WaterLog[] = []
const EMPTY_WEIGHTS: BodyWeight[] = []
const EMPTY_WORKOUTS: Workout[] = []
const EMPTY_SETS: WorkoutSet[] = []
const EMPTY_EX: Exercise[] = []

export function DashboardPage() {
  const t = useSettingsStore((s) => s.t)
  const settings = useSettingsStore((s) => s.settings)
  const navigate = useNavigate()
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(14)
  const today = todayKey()

  const meals =
    useLiveQuery(
      () => db.meals.where('date').equals(today).toArray(),
      [today],
      EMPTY_MEALS
    ) ?? EMPTY_MEALS
  const water =
    useLiveQuery(
      () => db.waterLogs.where('date').equals(today).toArray(),
      [today],
      EMPTY_WATER
    ) ?? EMPTY_WATER
  const activeWorkout = useLiveQuery(
    () => db.workouts.where('status').equals('active').first(),
    []
  )
  const plannedToday = useLiveQuery(
    () =>
      db.workouts
        .where('date')
        .equals(today)
        .filter((w) => w.status !== 'done')
        .first(),
    [today]
  )
  const weights =
    useLiveQuery(
      () => db.bodyWeight.orderBy('date').reverse().limit(60).toArray(),
      [],
      EMPTY_WEIGHTS
    ) ?? EMPTY_WEIGHTS
  const weekKeys = lastNDaysKeys(7)
  const weekKeysDep = weekKeys.join(',')
  const weekWorkouts =
    useLiveQuery(
      async () => {
        const all = await db.workouts.where('date').anyOf(weekKeys).toArray()
        return all.filter((w) => w.status === 'done')
      },
      [weekKeysDep],
      EMPTY_WORKOUTS
    ) ?? EMPTY_WORKOUTS
  const weekWorkoutIds = weekWorkouts.map((w) => w.id).join(',')
  const weekSets =
    useLiveQuery(
      async () => {
        const ids = weekWorkouts.map((w) => w.id)
        if (!ids.length) return EMPTY_SETS
        return db.sets.where('workoutId').anyOf(ids).toArray()
      },
      [weekWorkoutIds],
      EMPTY_SETS
    ) ?? EMPTY_SETS
  const exercises =
    useLiveQuery(() => db.exercises.toArray(), [], EMPTY_EX) ?? EMPTY_EX

  const dayTotals = useMemo(() => {
    if (!meals.length) return emptyMacros()
    return sumMacros(meals.map((m) => m.totals))
  }, [meals])

  const waterMl = water.reduce((s, w) => s + w.ml, 0)

  const trendData = useMemo(() => {
    const keys = lastNDaysKeys(trendDays)
    const map = new Map(weights.map((w) => [w.date, w.weightKg]))
    return keys
      .filter((k) => map.has(k))
      .map((k) => ({
        date: k,
        label: formatShortDate(k, settings.locale),
        weight: map.get(k)!,
      }))
  }, [weights, trendDays, settings.locale])

  const latestWeight = weights[0]

  const muscleVol = useMemo(() => {
    const map = new Map(exercises.map((e) => [e.id, e]))
    return muscleVolumeFromSets(weekSets, map)
  }, [weekSets, exercises])

  const maxVol = maxMuscleVolume(muscleVol)

  const adaptive = useMemo(() => {
    const days = lastNDaysKeys(14)
    // approximate avg from meals in range - load via weights only for slope
    const weightPts = weights
      .filter((w) => days.includes(w.date))
      .map((w) => ({ date: w.date, weightKg: w.weightKg }))
    if (weightPts.length < 3) return null
    const slope = weightSlopeKgPerWeek(weightPts)
    // use current goal as proxy when we don't have full 14d meal avg in dashboard
    return suggestAdaptiveCalories({
      avgIntakeKcal: settings.goals.kcal,
      weightSlopeKgPerWeek: slope,
      currentWeightKg: latestWeight?.weightKg ?? settings.profile.heightCm * 0.4,
      phase: settings.phase,
      daysOfData: weightPts.length,
    })
  }, [weights, settings, latestWeight])

  const workoutCard = activeWorkout ?? plannedToday

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground">{t.tagline}</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {t.settings[settings.phase]}
        </Badge>
      </header>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          className="h-auto flex-col gap-1 py-3"
          onClick={() => navigate('/nutrition?add=1')}
        >
          <Utensils className="h-5 w-5" />
          <span className="text-[11px] leading-tight text-center">
            {t.dashboard.quickAddFood}
          </span>
        </Button>
        <Button
          variant="secondary"
          className="h-auto flex-col gap-1 py-3"
          onClick={() => navigate('/workout')}
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-[11px] leading-tight text-center">
            {t.dashboard.quickStartWorkout}
          </span>
        </Button>
        <Button
          variant="secondary"
          className="h-auto flex-col gap-1 py-3"
          onClick={() => navigate('/progress?tab=weight')}
        >
          <Scale className="h-5 w-5" />
          <span className="text-[11px] leading-tight text-center">
            {t.dashboard.quickWeighIn}
          </span>
        </Button>
      </div>

      {/* Calories & macros */}
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.calories}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{dayTotals.kcal}</span>
            <span className="text-muted-foreground">
              / {settings.goals.kcal} {t.common.kcal}
            </span>
          </div>
          <MacroProgress
            label={t.common.kcal}
            current={dayTotals.kcal}
            goal={settings.goals.kcal}
            unit=""
            colorClass="bg-primary"
          />
          <MacroProgress
            label={t.common.protein}
            current={dayTotals.protein}
            goal={settings.goals.protein}
            colorClass="bg-sky-500"
          />
          <MacroProgress
            label={t.common.fat}
            current={dayTotals.fat}
            goal={settings.goals.fat}
            colorClass="bg-amber-500"
          />
          <MacroProgress
            label={t.common.carbs}
            current={dayTotals.carbs}
            goal={settings.goals.carbs}
            colorClass="bg-violet-500"
          />
          <MacroProgress
            label={t.common.water}
            current={waterMl}
            goal={settings.goals.waterMl}
            unit=" мл"
            colorClass="bg-cyan-500"
          />
        </CardContent>
      </Card>

      {/* Workout */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{t.dashboard.workout}</CardTitle>
          {activeWorkout && <Badge variant="success">{t.workout.active}</Badge>}
        </CardHeader>
        <CardContent>
          {workoutCard ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{workoutCard.name}</div>
                <div className="text-sm text-muted-foreground">{workoutCard.date}</div>
              </div>
              <Button asChild>
                <Link
                  to={
                    workoutCard.status === 'active'
                      ? `/workout/active/${workoutCard.id}`
                      : `/workout`
                  }
                >
                  {workoutCard.status === 'active' ? t.workout.active : t.workout.start}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t.dashboard.noWorkout}</p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/workout">
                  <Plus className="h-4 w-4" />
                  {t.workout.start}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weight trend */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t.dashboard.weight}</CardTitle>
            {latestWeight && (
              <p className="text-2xl font-bold tabular-nums mt-1">
                {formatWeight(latestWeight.weightKg, settings.weightUnit)}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((d) => (
              <Button
                key={d}
                size="sm"
                variant={trendDays === d ? 'default' : 'ghost'}
                onClick={() => setTrendDays(d)}
              >
                {d === 7
                  ? t.dashboard.days7
                  : d === 14
                    ? t.dashboard.days14
                    : t.dashboard.days30}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {trendData.length >= 2 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    width={40}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t.common.empty}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Adaptive tip */}
      {adaptive && (
        <Card className="border-primary/30">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle>{t.dashboard.adaptiveTip}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {settings.locale === 'ru' ? adaptive.reason : adaptive.reasonEn}
            </p>
            {adaptive.delta !== 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                → {adaptive.suggestedKcal} {t.common.kcal}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Muscle volume heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.muscleVolume}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MUSCLE_GROUPS.filter((m) => m !== 'full_body').map((m: MuscleGroup) => {
              const v = muscleVol[m] ?? 0
              const intensity = v / maxVol
              return (
                <div
                  key={m}
                  className={cn(
                    'rounded-lg p-2 text-center border border-border',
                    intensity > 0.01 ? 'bg-primary/10' : 'bg-muted/40'
                  )}
                  style={{
                    backgroundColor:
                      intensity > 0.01
                        ? `hsl(160 84% 39% / ${0.1 + intensity * 0.55})`
                        : undefined,
                  }}
                >
                  <div className="text-[11px] font-medium">{t.muscles[m]}</div>
                  <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
                    {Math.round(v)}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <footer className="pt-6 pb-2 text-center text-xs text-muted-foreground">
        <p>Alex Lashkin · 2026</p>
      </footer>
    </div>
  )
}
