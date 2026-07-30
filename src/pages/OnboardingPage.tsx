import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  calcMacroSplit,
  calcTdee,
  phaseCalorieTarget,
} from '@/lib/calc/macros'
import { db } from '@/db'
import { todayKey, uid } from '@/lib/dates'
import type { Locale, Phase, Sex } from '@/types'

export function OnboardingPage() {
  const t = useSettingsStore((s) => s.t)
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(settings.profile.name)
  const [age, setAge] = useState(settings.profile.age)
  const [height, setHeight] = useState(settings.profile.heightCm)
  const [sex, setSex] = useState<Sex>(settings.profile.sex)
  const [weight, setWeight] = useState(75)
  const [phase, setPhase] = useState<Phase>(settings.phase)
  const [locale, setLocale] = useState<Locale>(settings.locale)

  async function finish() {
    const weightKg = Number(weight) || 75
    const profile = {
      ...settings.profile,
      name,
      age,
      heightCm: height,
      sex,
    }
    const tdee = calcTdee(profile, weightKg)
    const kcal = phaseCalorieTarget(tdee, phase)
    const macros = calcMacroSplit(kcal, weightKg, phase)
    await update({
      profile,
      phase,
      locale,
      goals: { ...settings.goals, ...macros },
      onboardingDone: true,
    })
    // Persist starting weight so dashboard / progress have a baseline
    await db.bodyWeight.add({
      id: uid('bw-'),
      date: todayKey(),
      weightKg,
      createdAt: Date.now(),
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Dumbbell className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t.onboarding.welcome}</h1>
          <p className="text-sm text-muted-foreground">{t.onboarding.subtitle}</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {step === 0 && (
              <>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={locale === 'ru' ? 'default' : 'outline'}
                    onClick={() => {
                      setLocale('ru')
                      update({ locale: 'ru' })
                    }}
                  >
                    Русский
                  </Button>
                  <Button
                    className="flex-1"
                    variant={locale === 'en' ? 'default' : 'outline'}
                    onClick={() => {
                      setLocale('en')
                      update({ locale: 'en' })
                    }}
                  >
                    English
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label>{t.settings.name}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t.settings.age}</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t.settings.height} (cm)</Label>
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['male', 'female', 'other'] as Sex[]).map((s) => (
                    <Button
                      key={s}
                      className="flex-1"
                      size="sm"
                      variant={sex === s ? 'default' : 'outline'}
                      onClick={() => setSex(s)}
                    >
                      {t.settings[s]}
                    </Button>
                  ))}
                </div>
                <Button className="w-full" onClick={() => setStep(1)}>
                  {t.onboarding.next}
                </Button>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-1">
                  <Label>{t.progress.weight} (kg)</Label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.settings.phase}</Label>
                  <div className="flex gap-2">
                    {(['bulk', 'cut', 'maintain'] as Phase[]).map((p) => (
                      <Button
                        key={p}
                        className="flex-1"
                        size="sm"
                        variant={phase === p ? 'default' : 'outline'}
                        onClick={() => setPhase(p)}
                      >
                        {t.settings[p]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    {t.common.back}
                  </Button>
                  <Button className="flex-1" onClick={finish}>
                    {t.onboarding.start}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
