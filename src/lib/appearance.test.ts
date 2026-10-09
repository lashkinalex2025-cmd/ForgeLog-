import { describe, expect, it } from 'vitest'
import { hexToHslComponents, normalizeHex, prefersDarkText } from './appearance'

describe('normalizeHex', () => {
  it('accepts short and long hex', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc')
    expect(normalizeHex('C6A15B')).toBe('#c6a15b')
  })

  it('rejects junk', () => {
    expect(normalizeHex('red')).toBeNull()
    expect(normalizeHex('#12')).toBeNull()
  })
})

describe('hexToHslComponents', () => {
  it('converts black and white', () => {
    expect(hexToHslComponents('#000000')).toBe('0 0% 0%')
    expect(hexToHslComponents('#ffffff')).toBe('0 0% 100%')
  })
})

describe('prefersDarkText', () => {
  it('uses dark text on gold and white, light text on near-black', () => {
    expect(prefersDarkText('#c6a15b')).toBe(true)
    expect(prefersDarkText('#ffffff')).toBe(true)
    expect(prefersDarkText('#12100e')).toBe(false)
  })
})
