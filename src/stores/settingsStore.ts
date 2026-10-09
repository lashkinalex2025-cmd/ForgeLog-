import { create } from 'zustand'
import { db, DEFAULT_SETTINGS } from '@/db'
import type { AppSettings, Locale, ThemeMode } from '@/types'
import { applyAppearance } from '@/lib/appearance'
import { getDict } from '@/lib/i18n'
import type { TranslationKeys } from '@/lib/i18n/ru'

interface SettingsState {
  settings: AppSettings
  ready: boolean
  t: TranslationKeys
  load: () => Promise<void>
  update: (partial: Partial<AppSettings>) => Promise<void>
  setTheme: (theme: ThemeMode) => Promise<void>
  setLocale: (locale: Locale) => Promise<void>
}

let updateQueue: Promise<void> = Promise.resolve()

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  ready: false,
  t: getDict(DEFAULT_SETTINGS.locale),

  load: async () => {
    let s = await db.settings.get('main')
    if (!s) {
      s = DEFAULT_SETTINGS
      await db.settings.put(s)
    }
    applyAppearance(s)
    document.documentElement.lang = s.locale
    set({ settings: s, ready: true, t: getDict(s.locale) })
  },

  update: (partial) => {
    const run = updateQueue.then(async () => {
      const next = { ...get().settings, ...partial }
      if (partial.profile) {
        next.profile = { ...get().settings.profile, ...partial.profile }
      }
      if (partial.goals) {
        next.goals = { ...get().settings.goals, ...partial.goals }
      }
      if ('buttonColor' in partial && !partial.buttonColor) delete next.buttonColor
      if ('backgroundColor' in partial && !partial.backgroundColor) delete next.backgroundColor
      await db.settings.put(next)
      applyAppearance(next)
      if (partial.locale) {
        document.documentElement.lang = next.locale
      }
      set({
        settings: next,
        t: getDict(next.locale),
      })
    })
    updateQueue = run.then(
      () => undefined,
      () => undefined
    )
    return run
  },

  setTheme: async (theme) => get().update({ theme }),
  setLocale: async (locale) => get().update({ locale }),
}))
