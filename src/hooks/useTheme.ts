import { useEffect } from 'react'
import { applyAppearance } from '@/lib/appearance'
import { useSettingsStore } from '@/stores/settingsStore'

export function useThemeListener() {
  const theme = useSettingsStore((s) => s.settings.theme)
  const buttonColor = useSettingsStore((s) => s.settings.buttonColor)
  const backgroundColor = useSettingsStore((s) => s.settings.backgroundColor)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyAppearance({ theme, buttonColor, backgroundColor })
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme, buttonColor, backgroundColor])
}
