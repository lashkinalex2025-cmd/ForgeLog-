import { create } from 'zustand'
import { db, DEFAULT_SETTINGS } from '@/db'
import type { AppSettings, Locale, ThemeMode } from '@/types'
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

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0a0a0b' : '#f8fafc')
}

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
    applyTheme(s.theme)
    document.documentElement.lang = s.locale
    set({ settings: s, ready: true, t: getDict(s.locale) })
  },

  update: async (partial) => {
    const next = { ...get().settings, ...partial }
    if (partial.profile) {
      next.profile = { ...get().settings.profile, ...partial.profile }
    }
    if (partial.goals) {
      next.goals = { ...get().settings.goals, ...partial.goals }
    }
    await db.settings.put(next)
    if (partial.theme) applyTheme(next.theme)
    if (partial.locale) {
      document.documentElement.lang = next.locale
    }
    set({
      settings: next,
      t: getDict(next.locale),
    })
  },

  setTheme: async (theme) => get().update({ theme }),
  setLocale: async (locale) => get().update({ locale }),
}))
