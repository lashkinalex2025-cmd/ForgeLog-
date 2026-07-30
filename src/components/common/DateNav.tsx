import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDisplayDate, shiftDateKey, todayKey } from '@/lib/dates'
import { useSettingsStore } from '@/stores/settingsStore'

interface Props {
  date: string
  onChange: (date: string) => void
}

export function DateNav({ date, onChange }: Props) {
  const locale = useSettingsStore((s) => s.settings.locale)
  const t = useSettingsStore((s) => s.t)
  const isToday = date === todayKey()

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(shiftDateKey(date, -1))}
        aria-label="prev"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <button
        type="button"
        className="text-sm font-medium"
        onClick={() => onChange(todayKey())}
      >
        {isToday ? t.common.today : formatDisplayDate(date, locale)}
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(shiftDateKey(date, 1))}
        disabled={isToday}
        aria-label="next"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
