import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, FileDown, ImageDown, Scale, Ruler } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { weightDelta, estimateBodyFatNavy } from '@/lib/calc/body'
import {
  cmToDisplay,
  displayToCm,
  displayToKg,
  formatLength,
  formatWeight,
  kgToDisplay,
} from '@/lib/units'
import { compressImage } from '@/lib/exportImport'
import { exportElementAsPdf, exportElementAsPng } from '@/lib/exportProgress'
import { formatShortDate, todayKey, uid } from '@/lib/dates'
import type { BodyWeight, Measurement, ProgressPhoto, PhotoSide } from '@/types'

const EMPTY_WEIGHTS: BodyWeight[] = []
const EMPTY_MEAS: Measurement[] = []
const EMPTY_PHOTOS: ProgressPhoto[] = []

export function ProgressPage() {
  const t = useSettingsStore((s) => s.t)
  const settings = useSettingsStore((s) => s.settings)
  const toast = useUiStore((s) => s.toast)
  const [params] = useSearchParams()
  const tabParam = params.get('tab')
  const defaultTab =
    tabParam === 'meas' || tabParam === 'photos' || tabParam === 'weight'
      ? tabParam
      : 'weight'

  const weights =
    useLiveQuery(() => db.bodyWeight.orderBy('date').toArray(), [], EMPTY_WEIGHTS) ??
    EMPTY_WEIGHTS
  const measurements =
    useLiveQuery(() => db.measurements.orderBy('date').toArray(), [], EMPTY_MEAS) ??
    EMPTY_MEAS
  const photos =
    useLiveQuery(
      () => db.progressPhotos.orderBy('date').reverse().toArray(),
      [],
      EMPTY_PHOTOS
    ) ?? EMPTY_PHOTOS

  const [weightOpen, setWeightOpen] = useState(params.get('tab') === 'weight')
  const [measOpen, setMeasOpen] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [meas, setMeas] = useState({
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
    neck: '',
    calves: '',
  })
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Stable key so we only rebuild object URLs when photo set actually changes
  const photoKey = photos.map((p) => p.id).join(',')

  useEffect(() => {
    let cancelled = false
    const urls: Record<string, string> = {}
    photos.forEach((p) => {
      urls[p.id] = URL.createObjectURL(p.blob)
    })
    if (!cancelled) setPhotoUrls(urls)
    return () => {
      cancelled = true
      Object.values(urls).forEach(URL.revokeObjectURL)
    }
    // photos reference is stable via EMPTY_PHOTOS / live query; photoKey tracks content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey])

  useEffect(() => {
    if (params.get('tab') === 'weight') setWeightOpen(true)
  }, [params])

  const chartData = useMemo(
    () =>
      weights.map((w) => ({
        date: w.date,
        label: formatShortDate(w.date, settings.locale),
        weight: kgToDisplay(w.weightKg, settings.weightUnit),
      })),
    [weights, settings.locale, settings.weightUnit]
  )

  const measChart = useMemo(
    () =>
      measurements.map((m) => ({
        label: formatShortDate(m.date, settings.locale),
        waist: m.waist != null ? cmToDisplay(m.waist, settings.lengthUnit) : undefined,
        chest: m.chest != null ? cmToDisplay(m.chest, settings.lengthUnit) : undefined,
        arms: m.arms != null ? cmToDisplay(m.arms, settings.lengthUnit) : undefined,
      })),
    [measurements, settings.locale, settings.lengthUnit]
  )

  const delta = weightDelta(weights.map((w) => ({ date: w.date, weightKg: w.weightKg })))
  const latestMeas = measurements[measurements.length - 1]
  const bf =
    latestMeas?.waist && latestMeas?.neck
      ? estimateBodyFatNavy({
          sex: settings.profile.sex,
          heightCm: settings.profile.heightCm,
          waistCm: latestMeas.waist,
          neckCm: latestMeas.neck,
          hipsCm: latestMeas.hips,
        })
      : null

  async function saveWeight() {
    const v = Number(weightInput)
    if (!v) return
    await db.bodyWeight.add({
      id: uid('bw-'),
      date: todayKey(),
      weightKg: displayToKg(v, settings.weightUnit),
      createdAt: Date.now(),
    })
    setWeightOpen(false)
    setWeightInput('')
    toast({ title: t.progress.logWeight, variant: 'success' })
  }

  async function saveMeasurements() {
    const toCm = (s: string) =>
      s ? displayToCm(Number(s), settings.lengthUnit) : undefined
    await db.measurements.add({
      id: uid('ms-'),
      date: todayKey(),
      chest: toCm(meas.chest),
      waist: toCm(meas.waist),
      hips: toCm(meas.hips),
      arms: toCm(meas.arms),
      thighs: toCm(meas.thighs),
      neck: toCm(meas.neck),
      calves: toCm(meas.calves),
      createdAt: Date.now(),
    })
    setMeasOpen(false)
    toast({ title: t.progress.logMeasurements, variant: 'success' })
  }

  async function onPhoto(file: File, side: PhotoSide) {
    const blob = await compressImage(file)
    await db.progressPhotos.add({
      id: uid('ph-'),
      date: todayKey(),
      side,
      blob,
      createdAt: Date.now(),
    })
    toast({ title: t.progress.addPhoto, variant: 'success' })
  }

  async function handleExport(format: 'png' | 'pdf') {
    const el = exportRef.current
    if (!el || exporting) return
    setExporting(true)
    try {
      if (format === 'png') await exportElementAsPng(el)
      else await exportElementAsPdf(el)
      toast({ title: t.progress.exportDone, variant: 'success' })
    } catch {
      toast({ title: t.progress.exportFailed, variant: 'warning' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.progress.title}</h1>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => handleExport('png')}
            aria-label={t.progress.exportPng}
          >
            <ImageDown className="h-4 w-4" />
            <span className="hidden sm:inline">
              {exporting ? t.progress.exporting : t.progress.exportPng}
            </span>
            <span className="sm:hidden">PNG</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => handleExport('pdf')}
            aria-label={t.progress.exportPdf}
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">
              {exporting ? t.progress.exporting : t.progress.exportPdf}
            </span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </header>

      <div ref={exportRef} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">{t.progress.totalChange}</div>
            <div className="text-xl font-bold tabular-nums">
              {delta.total >= 0 ? '+' : ''}
              {formatWeight(Math.abs(delta.total), settings.weightUnit)}
              {delta.total < 0 ? ' ↓' : delta.total > 0 ? ' ↑' : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              {delta.perWeek.toFixed(2)} {settings.weightUnit} {t.progress.perWeek}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">{t.progress.bodyFat}</div>
            <div className="text-xl font-bold tabular-nums">
              {bf != null ? `${bf}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Navy formula</div>
          </CardContent>
        </Card>
      </div>

      <Tabs key={defaultTab} defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="weight">
            <Scale className="h-4 w-4 mr-1" />
            {t.progress.weight}
          </TabsTrigger>
          <TabsTrigger value="meas">
            <Ruler className="h-4 w-4 mr-1" />
            {t.progress.measurements}
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 mr-1" />
            {t.progress.photos}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weight" className="space-y-3">
          <Button className="w-full" onClick={() => setWeightOpen(true)}>
            {t.progress.logWeight}
          </Button>
          <Card>
            <CardContent className="pt-4">
              {chartData.length >= 2 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tick={{ fontSize: 10 }}
                        width={40}
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
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t.common.empty}
                </p>
              )}
            </CardContent>
          </Card>
          <div className="space-y-1">
            {[...weights].reverse().slice(0, 10).map((w) => (
              <div
                key={w.id}
                className="flex justify-between text-sm px-2 py-2 rounded-lg hover:bg-muted"
              >
                <span className="text-muted-foreground">{w.date}</span>
                <span className="font-medium tabular-nums">
                  {formatWeight(w.weightKg, settings.weightUnit)}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="meas" className="space-y-3">
          <Button className="w-full" onClick={() => setMeasOpen(true)}>
            {t.progress.logMeasurements}
          </Button>
          {measChart.length >= 2 && (
            <Card>
              <CardContent className="pt-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={measChart}>
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
                      <Legend />
                      <Line type="monotone" dataKey="waist" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="chest" stroke="#38bdf8" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="arms" stroke="#a78bfa" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {latestMeas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{latestMeas.date}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ['chest', t.progress.chest],
                    ['waist', t.progress.waist],
                    ['hips', t.progress.hips],
                    ['arms', t.progress.arms],
                    ['thighs', t.progress.thighs],
                    ['neck', t.progress.neck],
                    ['calves', t.progress.calves],
                  ] as const
                ).map(([key, label]) => {
                  const v = latestMeas[key]
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">
                        {v != null ? formatLength(v, settings.lengthUnit) : '—'}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="photos" className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['front', 'side', 'back'] as PhotoSide[]).map((side) => (
              <label key={side} className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onPhoto(f, side)
                  }}
                />
                <div className="rounded-xl border border-dashed border-border p-4 text-center hover:bg-muted transition-colors">
                  <Camera className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs font-medium">{t.progress[side]}</div>
                </div>
              </label>
            ))}
          </div>

          {photos.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.progress.compare}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={compareA} onValueChange={setCompareA}>
                    <SelectTrigger>
                      <SelectValue placeholder="A" />
                    </SelectTrigger>
                    <SelectContent>
                      {photos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.date} · {p.side}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={compareB} onValueChange={setCompareB}>
                    <SelectTrigger>
                      <SelectValue placeholder="B" />
                    </SelectTrigger>
                    <SelectContent>
                      {photos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.date} · {p.side}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {compareA && photoUrls[compareA] && (
                    <img
                      src={photoUrls[compareA]}
                      alt="A"
                      className="rounded-lg object-cover aspect-[3/4] w-full bg-muted"
                    />
                  )}
                  {compareB && photoUrls[compareB] && (
                    <img
                      src={photoUrls[compareB]}
                      alt="B"
                      className="rounded-lg object-cover aspect-[3/4] w-full bg-muted"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative rounded-lg overflow-hidden bg-muted">
                {photoUrls[p.id] && (
                  <img
                    src={photoUrls[p.id]}
                    alt={p.side}
                    className="aspect-[3/4] w-full object-cover"
                  />
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-2 py-1">
                  {p.date} · {t.progress[p.side]}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>

      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.progress.logWeight}</DialogTitle>
          </DialogHeader>
          <Label>
            {settings.weightUnit}
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            autoFocus
          />
          <Button onClick={saveWeight}>{t.common.save}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={measOpen} onOpenChange={setMeasOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.progress.logMeasurements}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(
              [
                ['chest', t.progress.chest],
                ['waist', t.progress.waist],
                ['hips', t.progress.hips],
                ['arms', t.progress.arms],
                ['thighs', t.progress.thighs],
                ['neck', t.progress.neck],
                ['calves', t.progress.calves],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>
                  {label} ({settings.lengthUnit})
                </Label>
                <Input
                  type="number"
                  value={meas[key]}
                  onChange={(e) => setMeas({ ...meas, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button onClick={saveMeasurements}>{t.common.save}</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
