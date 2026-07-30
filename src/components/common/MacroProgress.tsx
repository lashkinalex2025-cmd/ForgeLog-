import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/cn'

export function MacroProgress({
  label,
  current,
  goal,
  unit = 'g',
  colorClass = 'bg-primary',
}: {
  label: string
  current: number
  goal: number
  unit?: string
  colorClass?: string
}) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  const over = current > goal && goal > 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', over && 'text-warning')}>
          {Math.round(current)}
          {unit} / {Math.round(goal)}
          {unit}
        </span>
      </div>
      <Progress
        value={pct}
        className="h-2"
        indicatorClassName={cn(colorClass, over && 'bg-warning')}
      />
    </div>
  )
}
