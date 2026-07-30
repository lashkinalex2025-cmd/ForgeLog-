import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning'
}

interface UiState {
  toasts: Toast[]
  restSecondsLeft: number
  restRunning: boolean
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  startRest: (seconds: number) => void
  stopRest: () => void
  addRest: (seconds: number) => void
  tickRest: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  restSecondsLeft: 0,
  restRunning: false,

  toast: (t) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().dismissToast(id), 3200)
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  startRest: (seconds) => set({ restSecondsLeft: seconds, restRunning: true }),
  stopRest: () => set({ restRunning: false, restSecondsLeft: 0 }),
  addRest: (seconds) =>
    set((s) => ({ restSecondsLeft: s.restSecondsLeft + seconds, restRunning: true })),
  tickRest: () => {
    const left = get().restSecondsLeft
    if (left <= 1) {
      set({ restSecondsLeft: 0, restRunning: false })
      try {
        navigator.vibrate?.(200)
      } catch {
        /* ignore */
      }
    } else {
      set({ restSecondsLeft: left - 1 })
    }
  },
}))
