const SESSION_KEY = 'forgelog-welcome-played'

function playApplause(ctx: AudioContext, durationSec = 2.2): Promise<void> {
  return new Promise((resolve) => {
    const sampleRate = ctx.sampleRate
    const length = Math.floor(sampleRate * durationSec)
    const buffer = ctx.createBuffer(2, length, sampleRate)

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        const envelope =
          Math.min(1, t * 8) * Math.exp(-t * 1.35) * (0.55 + 0.45 * Math.random())
        // Filtered noise bursts approximate applause claps
        const clap =
          (Math.random() * 2 - 1) *
          (0.35 + 0.65 * Math.pow(Math.random(), 0.35))
        data[i] = clap * envelope * 0.45
      }
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1800
    filter.Q.value = 0.7

    const gain = ctx.createGain()
    gain.gain.value = 0.9

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    source.onended = () => resolve()
    source.start()
  })
}

function speakReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve()
      return
    }

    const utter = new SpeechSynthesisUtterance('Are you ready!!!')
    utter.lang = 'en-US'
    utter.rate = 1
    utter.pitch = 0.75
    utter.volume = 1

    const pickMaleVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const male =
        voices.find((v) => /male|david|mark|george|daniel|ryan|guy/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en') && !/female|zira|samantha|karen/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en'))
      if (male) utter.voice = male
    }

    pickMaleVoice()
    if (!utter.voice) {
      window.speechSynthesis.onvoiceschanged = () => {
        pickMaleVoice()
      }
    }

    utter.onend = () => resolve()
    utter.onerror = () => resolve()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  })
}

let playing = false

/** Play applause then a male TTS line. Once per browser session. */
export async function playWelcomeAudio(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return
  } catch {
    // ignore storage errors
  }
  if (playing) return
  playing = true

  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    await playApplause(ctx)
    await ctx.close()
    await speakReady()
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // ignore
    }
  } catch {
    // Autoplay may be blocked; fall through to gesture retry
    playing = false
  }
}

/** Attach a one-shot listener so welcome audio plays after first user gesture if autoplay failed. */
export function armWelcomeAudioOnGesture(): () => void {
  const handler = () => {
    void playWelcomeAudio()
  }
  const opts: AddEventListenerOptions = { once: true, capture: true }
  window.addEventListener('pointerdown', handler, opts)
  window.addEventListener('keydown', handler, opts)
  return () => {
    window.removeEventListener('pointerdown', handler, opts)
    window.removeEventListener('keydown', handler, opts)
  }
}
