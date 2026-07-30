import type { Locale } from '@/types'
import { ru, type TranslationKeys } from './ru'
import { en } from './en'

const dicts: Record<Locale, TranslationKeys> = { ru, en }

type NestedKeyOf<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], P extends '' ? K : `${P}.${K}`>
        : P extends ''
          ? K
          : `${P}.${K}`
    }[keyof T & string]
  : never

export type I18nKey = NestedKeyOf<TranslationKeys>

function getByPath(obj: unknown, path: string): string {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path
    cur = (cur as Record<string, unknown>)[p]
  }
  return typeof cur === 'string' ? cur : path
}

export function translate(locale: Locale, key: string): string {
  return getByPath(dicts[locale] ?? dicts.ru, key)
}

export function getDict(locale: Locale): TranslationKeys {
  return dicts[locale] ?? dicts.ru
}
