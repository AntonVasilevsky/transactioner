import { describe, expect, it } from 'vitest'
import { hasTypedHours, parseTimeOfDay, typeTimeDigits, withHour, withMinute } from './timeOfDay'

describe('time of day', () => {
  it('reads the time as typed or shown by a messenger; only the hour means :00', () => {
    expect(parseTimeOfDay('14:36')).toEqual({ hour: 14, minute: 36 })
    expect(parseTimeOfDay('1436')).toEqual({ hour: 14, minute: 36 })
    expect(parseTimeOfDay('9.05')).toEqual({ hour: 9, minute: 5 })
    expect(parseTimeOfDay('14:')).toEqual({ hour: 14, minute: 0 })
    expect(parseTimeOfDay('14')).toEqual({ hour: 14, minute: 0 })
    expect(parseTimeOfDay('14:3')).toBeNull()
    expect(parseTimeOfDay('24:00')).toBeNull()
    expect(parseTimeOfDay('')).toBeNull()
  })

  it('sets the hour keeping the minutes, and the minutes keeping the hour', () => {
    expect(withHour('', 14)).toBe('14:00')
    expect(withHour('09:35', 14)).toBe('14:35')
    expect(withMinute('14:00', 35)).toBe('14:35')
  })

  it('puts the colon in after the hours and moves on to the minutes while typing', () => {
    const type = (keys: string) => [...keys].reduce((value, key) => typeTimeDigits(value, value + key), '')
    expect(type('1')).toBe('1')
    expect(type('14')).toBe('14:')
    expect(hasTypedHours(type('14'))).toBe(true)
    expect(type('1435')).toBe('14:35')
    expect(type('14359')).toBe('14:35')
    expect(type('9')).toBe('09:')
    expect(type('97')).toBe('09:07')
    expect(type('25')).toBe('2')
    expect(type('235')).toBe('23:5')
    expect(typeTimeDigits('', '14:35')).toBe('14:35')
  })

  it('lets Backspace go back through the colon', () => {
    expect(typeTimeDigits('14:3', '14:')).toBe('14:')
    expect(typeTimeDigits('14:', '14')).toBe('1')
    expect(typeTimeDigits('1', '')).toBe('')
  })
})
