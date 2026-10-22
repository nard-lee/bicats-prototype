import { describe, expect, it } from 'vitest'

import { daysInMonth, formatDisplay, pad, parseLocal, to12, toLocalInput } from './datetime'

describe('parseLocal', () => {
  it('returns null for empty or invalid values', () => {
    expect(parseLocal()).toBeNull()
    expect(parseLocal(null)).toBeNull()
    expect(parseLocal('')).toBeNull()
    expect(parseLocal('not-a-date')).toBeNull()
  })

  it('parses a local datetime value', () => {
    expect(parseLocal('2026-08-10T14:30')?.getTime()).toBe(
      new Date(2026, 7, 10, 14, 30).getTime(),
    )
  })
})

describe('toLocalInput', () => {
  it('pads every date part for a datetime-local value', () => {
    expect(toLocalInput(new Date(2026, 0, 5, 7, 9))).toBe('2026-01-05T07:09')
  })
})

describe('formatDisplay', () => {
  const now = new Date(2026, 7, 10, 9, 0)

  it('labels the current day', () => {
    expect(formatDisplay(new Date(2026, 7, 10, 17, 45), now)).toMatch(/^Today, /)
  })

  it('labels the next day', () => {
    expect(formatDisplay(new Date(2026, 7, 11, 8, 0), now)).toMatch(/^Tomorrow, /)
  })

  it('shows the full date for other days', () => {
    const text = formatDisplay(new Date(2026, 8, 1, 8, 0), now)
    expect(text).not.toMatch(/^(Today|Tomorrow)/)
    expect(text).toContain('2026')
    expect(text).toContain('·')
  })
})

describe('to12', () => {
  it('converts midnight and noon to 12', () => {
    expect(to12(0)).toEqual({ h12: 12, meridiem: 'AM' })
    expect(to12(12)).toEqual({ h12: 12, meridiem: 'PM' })
  })

  it('keeps morning and evening hours', () => {
    expect(to12(11)).toEqual({ h12: 11, meridiem: 'AM' })
    expect(to12(13)).toEqual({ h12: 1, meridiem: 'PM' })
    expect(to12(23)).toEqual({ h12: 11, meridiem: 'PM' })
  })
})

describe('daysInMonth', () => {
  it('knows month lengths including leap years', () => {
    expect(daysInMonth(2026, 0)).toBe(31)
    expect(daysInMonth(2026, 3)).toBe(30)
    expect(daysInMonth(2026, 1)).toBe(28)
    expect(daysInMonth(2024, 1)).toBe(29)
  })
})

describe('pad', () => {
  it('pads single digits only', () => {
    expect(pad(4)).toBe('04')
    expect(pad(12)).toBe('12')
  })
})
