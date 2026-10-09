import type { AppSettings, ThemeMode } from '@/types'

const OVERRIDE_VARS = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--border',
  '--input',
  '--ring',
] as const

export const THEME_BUTTON_FALLBACK: Record<ThemeMode, string> = {
  dark: '#14c48a',
  light: '#10b37a',
  system: '#14c48a',
  premium: '#c6a15b',
}

export const THEME_BG_FALLBACK: Record<ThemeMode, string> = {
  dark: '#0b0b0c',
  light: '#f7f8fa',
  system: '#0b0b0c',
  premium: '#12100e',
}

/** Accepts #RGB, #RRGGBB, RGB, or RRGGBB. Returns lowercase #rrggbb. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`
  return null
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normalizeHex(hex)
  if (!norm) return null
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  }
}

/** Tailwind-ready HSL components, e.g. "160 84% 39%". */
export function hexToHslComponents(hex: string): string | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const rn = rgb.r / 255
  const gn = rgb.g / 255
  const bn = rgb.b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h /= 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b)
}

/** True when dark label text is more readable on this fill. */
export function prefersDarkText(hex: string): boolean {
  const L = relativeLuminance(hex)
  return L != null && L > 0.179
}

function tuneHsl(components: string, saturationScale: number, lightnessDelta: number): string {
  const m = components.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/)
  if (!m) return components
  const h = Number(m[1])
  const s = Math.min(100, Math.max(0, Number(m[2]) * saturationScale))
  const l = Math.min(100, Math.max(0, Number(m[3]) + lightnessDelta))
  return `${h} ${Math.round(s)}% ${Math.round(l)}%`
}

export function applyAppearance(
  settings: Pick<AppSettings, 'theme' | 'buttonColor' | 'backgroundColor'>
) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  root.classList.remove('dark', 'light', 'premium')

  let themeColor = '#0a0a0b'
  let scheme: 'light' | 'dark' = 'dark'
  if (settings.theme === 'premium') {
    root.classList.add('premium')
    themeColor = '#12100e'
  } else {
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
    root.classList.add(dark ? 'dark' : 'light')
    themeColor = dark ? '#0a0a0b' : '#f8fafc'
    scheme = dark ? 'dark' : 'light'
  }

  for (const name of OVERRIDE_VARS) root.style.removeProperty(name)
  root.removeAttribute('data-custom-bg')
  root.removeAttribute('data-custom-buttons')

  const bg = settings.backgroundColor ? normalizeHex(settings.backgroundColor) : null
  if (bg) {
    const hsl = hexToHslComponents(bg)
    if (hsl) {
      const light = prefersDarkText(bg)
      const fg = light ? '240 10% 8%' : '40 18% 96%'
      const card = tuneHsl(hsl, 0.45, light ? -4 : 5)
      const muted = tuneHsl(hsl, 0.28, light ? -8 : 8)
      const border = tuneHsl(hsl, 0.35, light ? -16 : 14)
      root.style.setProperty('--background', hsl)
      root.style.setProperty('--foreground', fg)
      root.style.setProperty('--card', card)
      root.style.setProperty('--card-foreground', fg)
      root.style.setProperty('--popover', card)
      root.style.setProperty('--popover-foreground', fg)
      root.style.setProperty('--muted', muted)
      root.style.setProperty('--muted-foreground', light ? '220 9% 36%' : '30 8% 72%')
      root.style.setProperty('--secondary', muted)
      root.style.setProperty('--secondary-foreground', fg)
      root.style.setProperty('--accent', muted)
      root.style.setProperty('--accent-foreground', fg)
      root.style.setProperty('--border', border)
      root.style.setProperty('--input', border)
      root.setAttribute('data-custom-bg', '')
      themeColor = bg
      scheme = light ? 'light' : 'dark'
    }
  }

  const btn = settings.buttonColor ? normalizeHex(settings.buttonColor) : null
  if (btn) {
    const hsl = hexToHslComponents(btn)
    if (hsl) {
      root.style.setProperty('--primary', hsl)
      root.style.setProperty('--ring', hsl)
      root.style.setProperty(
        '--primary-foreground',
        prefersDarkText(btn) ? '240 10% 8%' : '0 0% 100%'
      )
      root.setAttribute('data-custom-buttons', '')
    }
  }

  root.style.colorScheme = scheme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
}
