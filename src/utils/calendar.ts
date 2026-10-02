export interface CalendarMonth {
  year: number
  /** 0-based, as in Date. */
  month: number
}

export interface CalendarDay {
  iso: string
  day: number
  inMonth: boolean
}

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

export const CALENDAR_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const pad = (value: number) => String(value).padStart(2, '0')

export const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return toIsoDate(date) === value.trim() ? date : null
}

export const calendarMonthOf = (value: string, fallback = new Date()): CalendarMonth => {
  const date = parseIsoDate(value) || fallback
  return { year: date.getFullYear(), month: date.getMonth() }
}

export const shiftCalendarMonth = ({ year, month }: CalendarMonth, delta: number): CalendarMonth => {
  const date = new Date(year, month + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export const calendarMonthLabel = ({ year, month }: CalendarMonth) => `${monthNames[month]} ${year}`

/** Six Monday-first weeks covering the month. */
export const buildCalendarDays = ({ year, month }: CalendarMonth): CalendarDay[] => {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - offset + index)
    return { iso: toIsoDate(date), day: date.getDate(), inMonth: date.getMonth() === month }
  })
}
