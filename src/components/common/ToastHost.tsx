import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/cn'

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-left shadow-lg animate-fade-in',
            t.variant === 'success' && 'border-success/40 bg-card',
            t.variant === 'warning' && 'border-warning/40 bg-card',
            (!t.variant || t.variant === 'default') && 'border-border bg-card'
          )}
        >
          <div className="font-semibold text-sm">{t.title}</div>
          {t.description && (
            <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
          )}
        </button>
      ))}
    </div>
  )
}
