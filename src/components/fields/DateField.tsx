import { useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DropdownPanel } from './DropdownPanel'
import { useDropdownField } from './useDropdownField'
import {
  buildCalendarDays,
  calendarMonthLabel,
  calendarMonthOf,
  CALENDAR_WEEKDAYS,
  shiftCalendarMonth,
  toIsoDate,
  type CalendarMonth,
} from '../../utils/calendar'

interface DateFieldProps {
  /** YYYY-MM-DD */
  value: string
  onChange: (value: string) => void
  inputClassName?: string
}

// Date input with the app's own calendar instead of the native picker, so it
// follows the same open/close rules as the other drop-down fields.
export default function DateField({
  value,
  onChange,
  inputClassName = 'w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100 outline-none focus:border-blue-500',
}: DateFieldProps) {
  const [viewMonth, setViewMonth] = useState<CalendarMonth>(() => calendarMonthOf(value))
  const valueAtOpenRef = useRef(value)
  const field = useDropdownField({
    onOpen: () => {
      valueAtOpenRef.current = value
      setViewMonth(calendarMonthOf(value))
    },
    onDismiss: () => {
      if (value !== valueAtOpenRef.current) onChange(valueAtOpenRef.current)
    },
    // Typed changes are kept when focus leaves.
    onBlurClose: () => {},
  })
  const today = toIsoDate(new Date())

  const choose = (iso: string) => {
    field.close()
    if (iso !== value) onChange(iso)
  }

  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onMouseDown={field.handleMouseDown}
        onFocus={() => field.handleFocus()}
        onClick={(event) => {
          // Clicks inside the field select a date segment; never show the native picker.
          event.preventDefault()
          field.handleClick()
        }}
        onBlur={field.handleBlur}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && field.isOpen) {
            event.preventDefault()
            field.dismiss()
          }
        }}
        className={`[&::-webkit-calendar-picker-indicator]:hidden ${inputClassName}`}
      />
      {field.isOpen && (
        <DropdownPanel panelRef={field.panelRef} className="w-72">
          <div className="mb-2 flex items-center justify-between">
            <CalendarNavButton label="Предыдущий месяц" onClick={() => setViewMonth((month) => shiftCalendarMonth(month, -1))}>
              <ChevronLeft size={16} />
            </CalendarNavButton>
            <div className="text-sm font-semibold text-slate-200">{calendarMonthLabel(viewMonth)}</div>
            <CalendarNavButton label="Следующий месяц" onClick={() => setViewMonth((month) => shiftCalendarMonth(month, 1))}>
              <ChevronRight size={16} />
            </CalendarNavButton>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {CALENDAR_WEEKDAYS.map((weekday) => <div key={weekday} className="py-1">{weekday}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {buildCalendarDays(viewMonth).map((day) => (
              <button
                key={day.iso}
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(day.iso)}
                className={`rounded-lg py-1.5 transition-colors ${
                  day.iso === value
                    ? 'bg-blue-600 text-white'
                    : day.iso === today
                      ? 'border border-blue-500/50 text-blue-200 hover:bg-slate-800'
                      : day.inMonth
                        ? 'text-slate-200 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-800'
                }`}
              >
                {day.day}
              </button>
            ))}
          </div>
        </DropdownPanel>
      )}
    </div>
  )
}

function CalendarNavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
    >
      {children}
    </button>
  )
}
