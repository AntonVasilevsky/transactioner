/**
 * "HH:MM" time of day used by TimeField (owner 2026-10-17): the colon is put in by the field,
 * typing starts with the hours and moves on to the minutes by itself, the picker goes hours → minutes.
 */
const pad = (value: number) => String(value).padStart(2, '0')

/** "14:35", "1435", "14.35"; only the hour ("14", "14:") means 14:00. */
export const parseTimeOfDay = (value: string) => {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{1,2})(?:[:.\s](\d{2})?)?$/) || text.match(/^(\d{2})(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = match[2] === undefined ? 0 : Number(match[2])
  return hour <= 23 && minute <= 59 ? { hour, minute } : null
}

export const withHour = (value: string, hour: number) => `${pad(hour)}:${pad(parseTimeOfDay(value)?.minute ?? 0)}`

export const withMinute = (value: string, minute: number) => `${pad(parseTimeOfDay(value)?.hour ?? 0)}:${pad(minute)}`

/** The hours are complete, so the next digits are the minutes. */
export const hasTypedHours = (value: string) => /^\d{2}:/.test(value)

/**
 * What the field shows after a keystroke: digits only, the colon after two hour digits, at most
 * four digits. A first hour digit 3–9 means 03–09, a first minute digit 6–9 means 06–09; a digit
 * that would make the hour above 23 is ignored. Backspace right after the colon removes the last
 * hour digit instead of being undone by the colon coming back.
 */
export const typeTimeDigits = (previous: string, raw: string) => {
  let digits = String(raw || '').replace(/\D/g, '')
  if (previous.endsWith(':') && raw === previous.slice(0, -1)) digits = digits.slice(0, -1)
  let hours = ''
  let minutes = ''
  for (const digit of digits) {
    if (hours.length < 2) {
      if (!hours && Number(digit) > 2) hours = `0${digit}`
      else if (hours && Number(hours + digit) > 23) continue
      else hours += digit
    } else if (minutes.length < 2) {
      minutes += !minutes && Number(digit) > 5 ? `0${digit}` : digit
    }
  }
  return hours.length < 2 ? hours : `${hours}:${minutes}`
}

export const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => hour)
export const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)
