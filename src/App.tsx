import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { NutritionPage } from '@/pages/NutritionPage'
import { WorkoutPage } from '@/pages/WorkoutPage'
import { ActiveWorkoutPage } from '@/pages/ActiveWorkoutPage'
import { ProgressPage } from '@/pages/ProgressPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { useSettingsStore } from '@/stores/settingsStore'
import { useThemeListener } from '@/hooks/useTheme'
import { useRestTimerTicker } from '@/hooks/useRestTimer'
import { ensureSeeded } from '@/db/seed'

function Bootstrap() {
  const load = useSettingsStore((s) => s.load)
  const ready = useSettingsStore((s) => s.ready)
  const onboardingDone = useSettingsStore((s) => s.settings.onboardingDone)
  const [seeded, setSeeded] = useState(false)

  useThemeListener()
  useRestTimerTicker()

  useEffect(() => {
    ;(async () => {
      await ensureSeeded()
      await load()
      setSeeded(true)
    })()
  }, [load])

  if (!ready || !seeded) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-primary">ForgeLog</div>
          <div className="text-sm text-muted-foreground animate-pulse-soft">
            Loading…
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {!onboardingDone && (
        <Route path="/onboarding" element={<OnboardingPage />} />
      )}
      {!onboardingDone && (
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      )}
      {onboardingDone && (
        <>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="workout" element={<WorkoutPage />} />
            <Route path="workout/active/:id" element={<ActiveWorkoutPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  )
}

// On GitHub Pages the app is served from /ForgeLog-/ (must match vite base)
const routerBasename =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Bootstrap />
    </BrowserRouter>
  )
}
