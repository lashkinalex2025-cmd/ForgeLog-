import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Dumbbell,
  Home,
  Settings,
  TrendingUp,
  Utensils,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/cn'
import { ToastHost } from '@/components/common/ToastHost'
import { RestTimerBar } from '@/components/workout/RestTimerBar'

const nav = [
  { to: '/', icon: Home, key: 'dashboard' as const },
  { to: '/nutrition', icon: Utensils, key: 'nutrition' as const },
  { to: '/workout', icon: Dumbbell, key: 'workout' as const },
  { to: '/progress', icon: TrendingUp, key: 'progress' as const },
  { to: '/settings', icon: Settings, key: 'settings' as const },
]

export function AppShell() {
  const t = useSettingsStore((s) => s.t)
  const location = useLocation()
  const hideNav =
    location.pathname.startsWith('/workout/active') ||
    location.pathname.startsWith('/onboarding')

  return (
    <div className="min-h-dvh bg-background">
      <ToastHost />
      <RestTimerBar />

      {/* Desktop sidebar */}
      {!hideNav && (
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border bg-card z-40">
          <div className="px-5 py-6">
            <div className="text-xl font-bold tracking-tight text-primary">
              {t.appName}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{t.tagline}</div>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-touch',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {t.nav[item.key]}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      <main
        className={cn(
          'mx-auto w-full max-w-3xl px-4 py-4',
          !hideNav && 'lg:ml-60 lg:max-w-4xl pb-24 lg:pb-8'
        )}
      >
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {!hideNav && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-pb">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium min-h-touch',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {t.nav[item.key]}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
