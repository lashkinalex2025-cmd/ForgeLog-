const SESSION_KEY = 'forgelog-welcome-played-v2'

function assetUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}sounds/${file}`
}

function playHtmlAudio(src: string, volume = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.volume = Math.min(1, Math.max(0, volume))
    const done = () => {
      cleanup()
      resolve()
    }
    const fail = (err?: unknown) => {
      cleanup()
      reject(err instanceof Error ? err : new Error(String(err ?? 'audio failed')))
    }
    const cleanup = () => {
      audio.onended = null
      audio.onerror = null
    }
    audio.onended = done
    audio.onerror = () => fail(new Error(`Failed to load ${src}`))
    const p = audio.play()
    if (p && typeof p.then === 'function') {
      p.catch(fail)
    }
  })
}

let playing = false
let completed = false

function alreadyPlayed(): boolean {
  if (completed) return true
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markPlayed(): void {
  completed = true
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // ignore
  }
}

/**
 * Play applause, then a male voice saying "Are you ready!!!".
 * Browsers often block autoplay — call again after a user gesture until it succeeds.
 */
export async function playWelcomeAudio(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (alreadyPlayed()) return true
  if (playing) return false
  playing = true

  try {
    await playHtmlAudio(assetUrl('applause.wav'), 1)
    await playHtmlAudio(assetUrl('are-you-ready.wav'), 1)
    markPlayed()
    return true
  } catch {
    // Autoplay / load blocked — wait for next user gesture
    return false
  } finally {
    playing = false
  }
}

/**
 * Keep listening for user gestures until welcome audio finishes successfully.
 * Returns a cleanup function.
 */
export function armWelcomeAudioOnGesture(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (alreadyPlayed()) return () => {}

  let active = true

  const tryPlay = () => {
    if (!active || alreadyPlayed() || playing) return
    void playWelcomeAudio().then((ok) => {
      if (ok) detach()
    })
  }

  const opts: AddEventListenerOptions = { capture: true }
  const events = ['pointerdown', 'touchstart', 'keydown', 'click'] as const

  const detach = () => {
    if (!active) return
    active = false
    for (const ev of events) {
      window.removeEventListener(ev, tryPlay, opts)
    }
  }

  for (const ev of events) {
    window.addEventListener(ev, tryPlay, opts)
  }

  return detach
}
