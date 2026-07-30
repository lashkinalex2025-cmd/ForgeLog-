import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Plus, Search, Droplets } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '@/db'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DateNav } from '@/components/common/DateNav'
import { MacroProgress } from '@/components/common/MacroProgress'
import { emptyMacros, scaleMacros, sumMacros, calcTdee, phaseCalorieTarget, calcMacroSplit } from '@/lib/calc/macros'
import { lastNDaysKeys, todayKey, uid, formatShortDate } from '@/lib/dates'
import type { BodyWeight, Food, Meal, MealItem, MealType, Macros, WaterLog } from '@/types'
import { MEAL_TYPES } from '@/types'

const EMPTY_MEALS: Meal[] = []
const EMPTY_WATER: WaterLog[] = []
const EMPTY_FOODS: Food[] = []
const EMPTY_WEIGHTS: BodyWeight[] = []

export function NutritionPage() {
  const t = useSettingsStore((s) => s.t)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.update)
  const toast = useUiStore((s) => s.toast)
  const [date, setDate] = useState(todayKey())
  const [params, setParams] = useSearchParams()
  const [addOpen, setAddOpen] = useState(false)
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [customOpen, setCustomOpen] = useState(false)
  const [barcodeOpen, setBarcodeOpen] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [custom, setCustom] = useState({
    name: '',
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
  })

  useEffect(() => {
    if (params.get('add') === '1') {
      setAddOpen(true)
      const next = new URLSearchParams(params)
      next.delete('add')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const meals =
    useLiveQuery(
      () => db.meals.where('date').equals(date).toArray(),
      [date],
      EMPTY_MEALS
    ) ?? EMPTY_MEALS
  const waterLogs =
    useLiveQuery(
      () => db.waterLogs.where('date').equals(date).toArray(),
      [date],
      EMPTY_WATER
    ) ?? EMPTY_WATER
  const foods =
    useLiveQuery(() => db.foods.toArray(), [], EMPTY_FOODS) ?? EMPTY_FOODS
  const historyDays = lastNDaysKeys(14)
  const historyDaysDep = historyDays.join(',')
  const historyMeals =
    useLiveQuery(
      () => db.meals.where('date').anyOf(historyDays).toArray(),
      [historyDaysDep],
      EMPTY_MEALS
    ) ?? EMPTY_MEALS
  const weights =
    useLiveQuery(
      () => db.bodyWeight.orderBy('date').reverse().limit(1).toArray(),
      [],
      EMPTY_WEIGHTS
    ) ?? EMPTY_WEIGHTS

  const dayTotals = useMemo(() => {
    if (!meals.length) return emptyMacros()
    return sumMacros(meals.map((m) => m.totals))
  }, [meals])

  const waterMl = waterLogs.reduce((s, w) => s + w.ml, 0)

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return foods.slice(0, 40)
    return foods
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.nameEn.toLowerCase().includes(q) ||
          f.barcode?.includes(q)
      )
      .slice(0, 40)
  }, [foods, query])

  const chartData = useMemo(() => {
    return historyDays.map((d) => {
      const dayMeals = historyMeals.filter((m) => m.date === d)
      const totals = dayMeals.length ? sumMacros(dayMeals.map((m) => m.totals)) : emptyMacros()
      return {
        date: d,
        label: formatShortDate(d, settings.locale),
        kcal: totals.kcal,
        protein: totals.protein,
      }
    })
  }, [historyDays, historyMeals, settings.locale])

  async function addWater(ml: number) {
    await db.waterLogs.add({
      id: uid('w-'),
      date,
      ml,
      createdAt: Date.now(),
    })
  }

  async function addFoodToMeal() {
    if (!selectedFood) return
    const macros = scaleMacros(selectedFood.per100g, grams)
    const item: MealItem = {
      id: uid('mi-'),
      foodId: selectedFood.id,
      name:
        settings.locale === 'ru' ? selectedFood.name : selectedFood.nameEn,
      grams,
      macros,
    }

    const existing = meals.find((m) => m.type === mealType)
    if (existing) {
      const items = [...existing.items, item]
      const totals = sumMacros(items.map((i) => i.macros))
      await db.meals.update(existing.id, { items, totals })
    } else {
      const meal: Meal = {
        id: uid('meal-'),
        date,
        type: mealType,
        items: [item],
        totals: macros,
        createdAt: Date.now(),
      }
      await db.meals.add(meal)
    }
    toast({ title: '✓', description: item.name, variant: 'success' })
    setSelectedFood(null)
    setAddOpen(false)
    setQuery('')
  }

  async function removeItem(mealId: string, itemId: string) {
    const meal = await db.meals.get(mealId)
    if (!meal) return
    const items = meal.items.filter((i) => i.id !== itemId)
    if (!items.length) {
      await db.meals.delete(mealId)
    } else {
      await db.meals.update(mealId, {
        items,
        totals: sumMacros(items.map((i) => i.macros)),
      })
    }
  }

  async function saveCustomFood() {
    if (!custom.name.trim()) return
    const f: Food = {
      id: uid('f-'),
      name: custom.name.trim(),
      nameEn: custom.name.trim(),
      per100g: {
        kcal: Number(custom.kcal) || 0,
        protein: Number(custom.protein) || 0,
        fat: Number(custom.fat) || 0,
        carbs: Number(custom.carbs) || 0,
        fiber: Number(custom.fiber) || 0,
      },
      isCustom: true,
      createdAt: Date.now(),
    }
    await db.foods.add(f)
    setSelectedFood(f)
    setCustomOpen(false)
    toast({ title: t.nutrition.customFood, variant: 'success' })
  }

  async function findByBarcode(code: string) {
    const found = await db.foods.where('barcode').equals(code).first()
    if (found) {
      setSelectedFood(found)
      setBarcodeOpen(false)
      setAddOpen(true)
    } else {
      toast({
        title: t.nutrition.noFoods,
        description: code,
        variant: 'warning',
      })
    }
  }

  async function startBarcodeScan() {
    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        })
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        const video = document.createElement('video')
        video.srcObject = stream
        await video.play()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        let tries = 0
        const tick = async () => {
          if (tries++ > 80) {
            stream.getTracks().forEach((tr) => tr.stop())
            toast({ title: t.nutrition.barcodeUnsupported, variant: 'warning' })
            return
          }
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)
          try {
            const codes = await detector.detect(canvas)
            if (codes[0]?.rawValue) {
              stream.getTracks().forEach((tr) => tr.stop())
              await findByBarcode(codes[0].rawValue)
              return
            }
          } catch {
            /* continue */
          }
          requestAnimationFrame(tick)
        }
        tick()
        return
      } catch {
        /* fall through */
      }
    }
    setBarcodeOpen(true)
  }

  async function calculateGoals() {
    const w = weights[0]?.weightKg ?? 75
    const tdee = calcTdee(settings.profile, w)
    const kcal = phaseCalorieTarget(tdee, settings.phase)
    const macros = calcMacroSplit(kcal, w, settings.phase)
    await updateSettings({
      goals: {
        ...settings.goals,
        ...macros,
      },
    })
    toast({ title: t.nutrition.calculateGoals, description: `${kcal} kcal`, variant: 'success' })
  }

  const mealLabel = (type: MealType) => t.nutrition[type]

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.nutrition.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={startBarcodeScan}>
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              setAddOpen(true)
              setSelectedFood(null)
            }}
          >
            <Plus className="h-4 w-4" />
            {t.nutrition.addFood}
          </Button>
        </div>
      </header>

      <DateNav date={date} onChange={setDate} />

      <Tabs defaultValue="day">
        <TabsList>
          <TabsTrigger value="day">{t.nutrition.meals}</TabsTrigger>
          <TabsTrigger value="history">{t.nutrition.history}</TabsTrigger>
          <TabsTrigger value="goals">{t.nutrition.goals}</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <MacroProgress
                label={t.common.kcal}
                current={dayTotals.kcal}
                goal={settings.goals.kcal}
                unit=""
              />
              <div className="grid grid-cols-3 gap-2 text-center text-sm pt-1">
                <div>
                  <div className="text-muted-foreground">{t.common.protein}</div>
                  <div className="font-semibold tabular-nums">
                    {Math.round(dayTotals.protein)}g
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t.common.fat}</div>
                  <div className="font-semibold tabular-nums">
                    {Math.round(dayTotals.fat)}g
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t.common.carbs}</div>
                  <div className="font-semibold tabular-nums">
                    {Math.round(dayTotals.carbs)}g
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplets className="h-4 w-4 text-cyan-500" />
                {t.common.water}
              </CardTitle>
              <span className="text-sm tabular-nums text-muted-foreground">
                {waterMl} / {settings.goals.waterMl} мл
              </span>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => addWater(250)}>
                {t.nutrition.add250}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => addWater(500)}>
                {t.nutrition.add500}
              </Button>
            </CardContent>
          </Card>

          {MEAL_TYPES.map((type) => {
            const meal = meals.find((m) => m.type === type)
            return (
              <Card key={type}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{mealLabel(type)}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {meal?.totals.kcal ?? 0} {t.common.kcal}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMealType(type)
                        setAddOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {meal && meal.items.length > 0 && (
                  <CardContent className="space-y-2">
                    {meal.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.grams}g · Б{item.macros.protein} Ж{item.macros.fat} У
                            {item.macros.carbs}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-medium">
                            {item.macros.kcal}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeItem(meal.id, item.id)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t.nutrition.history}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="kcal" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {(
                [
                  ['kcal', t.common.kcal],
                  ['protein', t.common.protein],
                  ['fat', t.common.fat],
                  ['carbs', t.common.carbs],
                  ['waterMl', t.common.water],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    value={settings.goals[key as keyof typeof settings.goals] as number}
                    onChange={(e) =>
                      updateSettings({
                        goals: {
                          ...settings.goals,
                          [key]: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              ))}
              <Button className="w-full" onClick={calculateGoals}>
                {t.nutrition.calculateGoals}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add food dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.nutrition.addFood}</DialogTitle>
          </DialogHeader>
          {!selectedFood ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder={t.common.search}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button variant="outline" onClick={() => setCustomOpen(true)}>
                  {t.nutrition.customFood}
                </Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {MEAL_TYPES.map((mt) => (
                  <Button
                    key={mt}
                    size="sm"
                    variant={mealType === mt ? 'default' : 'outline'}
                    onClick={() => setMealType(mt)}
                  >
                    {mealLabel(mt)}
                  </Button>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
                {filteredFoods.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                    onClick={() => setSelectedFood(f)}
                  >
                    <div className="font-medium text-sm">
                      {settings.locale === 'ru' ? f.name : f.nameEn}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.per100g.kcal} {t.common.kcal} / 100g · Б{f.per100g.protein} Ж
                      {f.per100g.fat} У{f.per100g.carbs}
                    </div>
                  </button>
                ))}
                {!filteredFoods.length && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t.nutrition.noFoods}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-semibold">
                  {settings.locale === 'ru' ? selectedFood.name : selectedFood.nameEn}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedFood.per100g.kcal} {t.common.kcal} {t.nutrition.per100g}
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t.nutrition.grams}</Label>
                <Input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(Number(e.target.value) || 0)}
                />
                <div className="flex gap-2 mt-2">
                  {[50, 100, 150, 200].map((g) => (
                    <Button key={g} size="sm" variant="outline" onClick={() => setGrams(g)}>
                      {g}g
                    </Button>
                  ))}
                </div>
              </div>
              <PreviewMacros macros={scaleMacros(selectedFood.per100g, grams)} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedFood(null)}>
                  {t.common.back}
                </Button>
                <Button className="flex-1" onClick={addFoodToMeal}>
                  {t.common.add}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.nutrition.customFood}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={custom.name}
                onChange={(e) => setCustom({ ...custom, name: e.target.value })}
              />
            </div>
            {(['kcal', 'protein', 'fat', 'carbs', 'fiber'] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label>
                  {k} {t.nutrition.per100g}
                </Label>
                <Input
                  type="number"
                  value={custom[k]}
                  onChange={(e) =>
                    setCustom({ ...custom, [k]: Number(e.target.value) || 0 })
                  }
                />
              </div>
            ))}
            <Button className="w-full" onClick={saveCustomFood}>
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={barcodeOpen} onOpenChange={setBarcodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.nutrition.scanBarcode}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.nutrition.barcodeUnsupported}</p>
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="EAN / UPC"
          />
          <Button onClick={() => findByBarcode(barcode.trim())}>{t.common.search}</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PreviewMacros({ macros }: { macros: Macros }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center text-sm rounded-lg bg-muted p-3">
      <div>
        <div className="text-muted-foreground text-xs">kcal</div>
        <div className="font-semibold">{macros.kcal}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-xs">P</div>
        <div className="font-semibold">{macros.protein}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-xs">F</div>
        <div className="font-semibold">{macros.fat}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-xs">C</div>
        <div className="font-semibold">{macros.carbs}</div>
      </div>
    </div>
  )
}
