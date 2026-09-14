/** Web-Audio beeps + speech for the interval timer. */

let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) return null
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AC()
  }
  return sharedCtx
}

async function ensureRunning(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      /* ignore */
    }
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  durationMs: number,
  when = 0,
  volume = 0.22
): void {
  const t0 = ctx.currentTime + when
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + durationMs / 1000 + 0.02)
}

export type TimerSoundKind = 'start' | 'warn' | 'end' | 'phase'

export async function playTimerSound(kind: TimerSoundKind): Promise<void> {
  const ctx = getCtx()
  if (!ctx) return
  await ensureRunning(ctx)
  switch (kind) {
    case 'start':
      tone(ctx, 880, 140, 0, 0.25)
      tone(ctx, 1175, 180, 0.16, 0.22)
      break
    case 'phase':
      tone(ctx, 660, 120, 0, 0.2)
      break
    case 'warn':
      tone(ctx, 740, 80, 0, 0.18)
      break
    case 'end':
      tone(ctx, 523, 160, 0, 0.25)
      tone(ctx, 659, 160, 0.18, 0.25)
      tone(ctx, 784, 280, 0.36, 0.28)
      break
  }
}

export function speakText(text: string, locale: 'ru' | 'en'): void {
  if (typeof window === 'undefined' || !text.trim()) return
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text.trim())
    u.lang = locale === 'ru' ? 'ru-RU' : 'en-US'
    u.rate = 1
    u.volume = 1
    window.speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

export function vibratePattern(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}
