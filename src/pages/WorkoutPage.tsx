import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell, Library, ListChecks, Play, Plus } from 'lucide-react'
import { db } from '@/db'
import { useSettingsStore } from '@/stores/settingsStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { todayKey, uid } from '@/lib/dates'
import type { Equipment, Exercise, MuscleGroup, Routine } from '@/types'
import { MUSCLE_GROUPS } from '@/types'

export function WorkoutPage() {
  const t = useSettingsStore((s) => s.t)
  const settings = useSettingsStore((s) => s.settings)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string>('all')
  const [customOpen, setCustomOpen] = useState(false)
  const [detailEx, setDetailEx] = useState<Exercise | null>(null)
  const [customEx, setCustomEx] = useState({
    name: '',
    primaryMuscle: 'chest' as MuscleGroup,
    equipment: 'barbell' as Equipment,
  })

  const routines =
    useLiveQuery(() => db.routines.orderBy('createdAt').toArray(), []) ?? []
  const exercises =
    useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const workouts =
    useLiveQuery(() => db.workouts.orderBy('date').reverse().limit(30).toArray(), []) ??
    []
  const active = useLiveQuery(() => db.workouts.where('status').equals('active').first(), [])

  const filtered = exercises.filter((e) => {
    const q = search.toLowerCase()
    const name = (settings.locale === 'ru' ? e.name : e.nameEn).toLowerCase()
    const matchQ = !q || name.includes(q)
    const matchM = muscleFilter === 'all' || e.primaryMuscle === muscleFilter
    return matchQ && matchM
  })

  async function startFromRoutine(routine: Routine, dayIndex: number) {
    if (active) {
      navigate(`/workout/active/${active.id}`)
      return
    }
    const day = routine.days[dayIndex]
    const id = uid('wo-')
    await db.workouts.add({
      id,
      date: todayKey(),
      routineId: routine.id,
      name: `${routine.name} — ${day.name}`,
      startedAt: Date.now(),
      status: 'active',
    })
    // seed empty sets structure is created on active page as user logs
    // store exercise order in notes as JSON for active session
    await db.workouts.update(id, {
      notes: JSON.stringify({ exerciseIds: day.exerciseIds }),
    })
    navigate(`/workout/active/${id}`)
  }

  async function startEmpty() {
    if (active) {
      navigate(`/workout/active/${active.id}`)
      return
    }
    const id = uid('wo-')
    await db.workouts.add({
      id,
      date: todayKey(),
      name: settings.locale === 'ru' ? 'Свободная тренировка' : 'Open workout',
      startedAt: Date.now(),
      status: 'active',
      notes: JSON.stringify({ exerciseIds: [] }),
    })
    navigate(`/workout/active/${id}`)
  }

  async function saveCustomExercise() {
    if (!customEx.name.trim()) return
    const e: Exercise = {
      id: uid('e-'),
      name: customEx.name.trim(),
      nameEn: customEx.name.trim(),
      primaryMuscle: customEx.primaryMuscle,
      secondaryMuscles: [],
      equipment: customEx.equipment,
      isCustom: true,
    }
    await db.exercises.add(e)
    setCustomOpen(false)
    setCustomEx({ name: '', primaryMuscle: 'chest', equipment: 'barbell' })
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.workout.title}</h1>
        {active ? (
          <Button asChild>
            <Link to={`/workout/active/${active.id}`}>{t.workout.active}</Link>
          </Button>
        ) : (
          <Button onClick={startEmpty}>
            <Play className="h-4 w-4" />
            {t.workout.startEmpty}
          </Button>
        )}
      </header>

      <Tabs defaultValue="routines">
        <TabsList>
          <TabsTrigger value="routines">
            <ListChecks className="h-4 w-4 mr-1" />
            {t.workout.routines}
          </TabsTrigger>
          <TabsTrigger value="library">
            <Library className="h-4 w-4 mr-1" />
            {t.workout.library}
          </TabsTrigger>
          <TabsTrigger value="history">{t.workout.history}</TabsTrigger>
        </TabsList>

        <TabsContent value="routines" className="space-y-3">
          {routines.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{r.name}</span>
                  <Badge variant="secondary">{r.template}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {r.days.map((day, idx) => (
                  <div
                    key={day.name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <div className="font-medium text-sm">{day.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {day.exerciseIds.length} ex
                      </div>
                    </div>
                    <Button size="sm" onClick={() => startFromRoutine(r, idx)}>
                      <Play className="h-4 w-4" />
                      {t.workout.start}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="library" className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t.common.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setCustomOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={muscleFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setMuscleFilter('all')}
            >
              All
            </Button>
            {MUSCLE_GROUPS.filter((m) => m !== 'full_body').map((m) => (
              <Button
                key={m}
                size="sm"
                variant={muscleFilter === m ? 'default' : 'outline'}
                onClick={() => setMuscleFilter(m)}
              >
                {t.muscles[m]}
              </Button>
            ))}
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filtered.map((e) => (
              <button
                type="button"
                key={e.id}
                onClick={() => setDetailEx(e)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium text-sm">
                    {settings.locale === 'ru' ? e.name : e.nameEn}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.muscles[e.primaryMuscle]} · {t.equipment[e.equipment]}
                  </div>
                </div>
                {e.isCustom && <Badge variant="outline">custom</Badge>}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          {!workouts.length ? (
            <EmptyState icon={Dumbbell} title={t.workout.noWorkouts} />
          ) : (
            <div className="space-y-2">
              {workouts.map((w) => (
                <Card key={w.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.date}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          w.status === 'done'
                            ? 'success'
                            : w.status === 'active'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {w.status}
                      </Badge>
                      {w.status === 'active' && (
                        <Button size="sm" asChild>
                          <Link to={`/workout/active/${w.id}`}>{t.workout.active}</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.workout.customExercise}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={customEx.name}
                onChange={(e) => setCustomEx({ ...customEx, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Muscle</Label>
              <Select
                value={customEx.primaryMuscle}
                onValueChange={(v) =>
                  setCustomEx({ ...customEx, primaryMuscle: v as MuscleGroup })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t.muscles[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveCustomExercise}>
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailEx != null}
        onOpenChange={(open) => {
          if (!open) setDetailEx(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detailEx
                ? settings.locale === 'ru'
                  ? detailEx.name
                  : detailEx.nameEn
                : ''}
            </DialogTitle>
            {detailEx && (
              <p className="text-xs text-muted-foreground">
                {t.muscles[detailEx.primaryMuscle]} · {t.equipment[detailEx.equipment]}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.workout.technique}</p>
            <DialogDescription className="text-sm text-foreground leading-relaxed">
              {detailEx?.instructions?.trim()
                ? detailEx.instructions
                : t.workout.noTechnique}
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
