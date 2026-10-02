import { describe, expect, it } from 'vitest'
import { buildCalendarDays, calendarMonthLabel, calendarMonthOf, parseIsoDate, shiftCalendarMonth } from './calendar'

describe('calendar helpers', () => {
  it('builds Monday-first weeks for a month', () => {
    const days = buildCalendarDays({ year: 2026, month: 9 })

    expect(days).toHaveLength(42)
    expect(days[0]).toEqual({ iso: '2026-09-28', day: 28, inMonth: false })
    expect(days[3]).toEqual({ iso: '2026-10-01', day: 1, inMonth: true })
    expect(days.filter((day) => day.inMonth)).toHaveLength(31)
  })

  it('shifts months across years', () => {
    expect(shiftCalendarMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftCalendarMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(calendarMonthLabel({ year: 2026, month: 9 })).toBe('Октябрь 2026')
  })

  it('parses only valid ISO dates', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull()
    expect(parseIsoDate('02.10.2026')).toBeNull()
    expect(calendarMonthOf('2026-03-15')).toEqual({ year: 2026, month: 2 })
    expect(calendarMonthOf('', new Date(2026, 9, 2))).toEqual({ year: 2026, month: 9 })
  })
})
