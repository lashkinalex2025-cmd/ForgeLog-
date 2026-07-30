import {
  format,
  parseISO,
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  differenceInDays,
} from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import type { Locale } from '@/types'

export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDateKey(key: string): Date {
  return parseISO(key)
}

export function shiftDateKey(key: string, days: number): string {
  return toDateKey(addDays(parseDateKey(key), days))
}

export function formatDisplayDate(key: string, locale: Locale): string {
  const d = parseDateKey(key)
  return format(d, locale === 'ru' ? 'd MMMM yyyy' : 'MMM d, yyyy', {
    locale: locale === 'ru' ? ru : enUS,
  })
}

export function formatShortDate(key: string, locale: Locale): string {
  const d = parseDateKey(key)
  return format(d, locale === 'ru' ? 'd MMM' : 'MMM d', {
    locale: locale === 'ru' ? ru : enUS,
  })
}

export function lastNDaysKeys(n: number, from = todayKey()): string[] {
  const end = parseDateKey(from)
  return Array.from({ length: n }, (_, i) => toDateKey(subDays(end, n - 1 - i)))
}

export function weekRange(from = todayKey()): { start: string; end: string; days: string[] } {
  const d = parseDateKey(from)
  const start = startOfWeek(d, { weekStartsOn: 1 })
  const end = endOfWeek(d, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end }).map(toDateKey)
  return { start: toDateKey(start), end: toDateKey(end), days }
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(differenceInDays(parseDateKey(a), parseDateKey(b)))
}

export function uid(prefix = ''): string {
  return `${prefix}${crypto.randomUUID()}`
}
