import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Upload, Trash2, Smartphone } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  clearAllUserData,
  downloadExport,
  importAllData,
  type ExportPayload,
} from '@/lib/exportImport'
import { ensureSeeded } from '@/db/seed'
import { cmToDisplay, displayToCm } from '@/lib/units'
import type { ActivityLevel, LengthUnit, Locale, Phase, Sex, ThemeMode } from '@/types'

export function SettingsPage() {
  const t = useSettingsStore((s) => s.t)
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const load = useSettingsStore((s) => s.load)
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function onImport(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportPayload
      await importAllData(data, 'replace')
      await load()
      toast({ title: t.settings.import, variant: 'success' })
    } catch (e) {
      toast({
        title: 'Import failed',
        description: e instanceof Error ? e.message : 'error',
        variant: 'warning',
      })
    }
  }

  async function onClear() {
    if (!confirm(t.settings.clearConfirm)) return
    await clearAllUserData()
    await ensureSeeded()
    await load()
    toast({ title: t.settings.clearData, variant: 'warning' })
    navigate('/onboarding', { replace: true })
  }

  async function install() {
    const e = installPrompt as unknown as {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    if (!e?.prompt) return
    await e.prompt()
    setInstallPrompt(null)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">{t.settings.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.settings.profile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>{t.settings.name}</Label>
            <Input
              value={settings.profile.name}
              onChange={(e) =>
                update({ profile: { ...settings.profile, name: e.target.value } })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t.settings.age}</Label>
              <Input
                type="number"
                value={settings.profile.age}
                onChange={(e) =>
                  update({
                    profile: {
                      ...settings.profile,
                      age: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                {t.settings.height} ({settings.lengthUnit})
              </Label>
              <Input
                type="number"
                value={
                  Math.round(
                    cmToDisplay(settings.profile.heightCm, settings.lengthUnit) * 10
                  ) / 10
                }
                onChange={(e) =>
                  update({
                    profile: {
                      ...settings.profile,
                      heightCm: displayToCm(
                        Number(e.target.value) || 0,
                        settings.lengthUnit
                      ),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t.settings.sex}</Label>
            <Select
              value={settings.profile.sex}
              onValueChange={(v) =>
                update({ profile: { ...settings.profile, sex: v as Sex } })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t.settings.male}</SelectItem>
                <SelectItem value="female">{t.settings.female}</SelectItem>
                <SelectItem value="other">{t.settings.other}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t.settings.activity}</Label>
            <Select
              value={settings.profile.activity}
              onValueChange={(v) =>
                update({
                  profile: {
                    ...settings.profile,
                    activity: v as ActivityLevel,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    'sedentary',
                    'light',
                    'moderate',
                    'active',
                    'very_active',
                  ] as const
                ).map((a) => (
                  <SelectItem key={a} value={a}>
                    {t.settings[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.settings.phase}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {(['bulk', 'cut', 'maintain'] as Phase[]).map((p) => (
            <Button
              key={p}
              className="flex-1"
              variant={settings.phase === p ? 'default' : 'outline'}
              onClick={() => update({ phase: p })}
            >
              {t.settings[p]}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.settings.units} / {t.settings.language}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={settings.weightUnit === 'kg' ? 'default' : 'outline'}
              onClick={() => update({ weightUnit: 'kg' })}
            >
              kg
            </Button>
            <Button
              className="flex-1"
              variant={settings.weightUnit === 'lb' ? 'default' : 'outline'}
              onClick={() => update({ weightUnit: 'lb' })}
            >
              lb
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={settings.lengthUnit === 'cm' ? 'default' : 'outline'}
              onClick={() => update({ lengthUnit: 'cm' as LengthUnit })}
            >
              cm
            </Button>
            <Button
              className="flex-1"
              variant={settings.lengthUnit === 'in' ? 'default' : 'outline'}
              onClick={() => update({ lengthUnit: 'in' as LengthUnit })}
            >
              in
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={settings.locale === 'ru' ? 'default' : 'outline'}
              onClick={() => update({ locale: 'ru' as Locale })}
            >
              Русский
            </Button>
            <Button
              className="flex-1"
              variant={settings.locale === 'en' ? 'default' : 'outline'}
              onClick={() => update({ locale: 'en' as Locale })}
            >
              English
            </Button>
          </div>
          <div className="space-y-1">
            <Label>{t.settings.theme}</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => update({ theme: v as ThemeMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t.settings.themeDark}</SelectItem>
                <SelectItem value="light">{t.settings.themeLight}</SelectItem>
                <SelectItem value="system">{t.settings.themeSystem}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t.settings.restTimer}</Label>
            <Input
              type="number"
              value={settings.restTimerDefault}
              onChange={(e) =>
                update({ restTimerDefault: Number(e.target.value) || 90 })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t.settings.weightStep}</Label>
            <Input
              type="number"
              step="0.5"
              value={settings.weightIncrement}
              onChange={(e) =>
                update({ weightIncrement: Number(e.target.value) || 2.5 })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.settings.backup}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => downloadExport(true)}
          >
            <Download className="h-4 w-4" />
            {t.settings.export}
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {t.settings.import}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
            }}
          />
          <Button className="w-full" variant="destructive" onClick={onClear}>
            <Trash2 className="h-4 w-4" />
            {t.settings.clearData}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            {t.settings.install}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {installPrompt ? (
            <Button className="w-full" onClick={install}>
              {t.settings.installHint}
            </Button>
          ) : isIos ? (
            <p className="text-sm text-muted-foreground">{t.settings.installIos}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t.settings.installHint}</p>
          )}
          <p className="text-xs text-muted-foreground">{t.settings.offline}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.settings.about}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">ForgeLog</strong> v1.0.0
          </p>
          <p>MIT License · Offline-first PWA</p>
          <p>React · Vite · Dexie · Zustand · Tailwind</p>
        </CardContent>
      </Card>
    </div>
  )
}
