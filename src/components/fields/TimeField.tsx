import { useRef, useState } from 'react'
import { DropdownPanel } from './DropdownPanel'
import { useDropdownField } from './useDropdownField'
import {
  hasTypedHours,
  parseTimeOfDay,
  TIME_HOURS,
  TIME_MINUTES,
  typeTimeDigits,
  withHour,
  withMinute,
} from '../../utils/timeOfDay'

interface TimeFieldProps {
  /** HH:MM */
  value: string
  onChange: (value: string) => void
  inputClassName?: string
}

// Time input like DateField (owner 2026-10-17): the colon is put in by the field; typing starts with
// the hours and moves on to the minutes; the picker shows the hours first, then the minutes, then closes.
export default function TimeField({
  value,
  onChange,
  inputClassName = 'w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-100 outline-none focus:border-blue-500',
}: TimeFieldProps) {
  const valueAtOpenRef = useRef(value)
  const [step, setStep] = useState<'hour' | 'minute'>('hour')
  const field = useDropdownField({
    onOpen: () => {
      valueAtOpenRef.current = value
      setStep('hour')
    },
    onDismiss: () => {
      if (value !== valueAtOpenRef.current) onChange(valueAtOpenRef.current)
    },
    // A chosen hour or typed time is kept when focus leaves.
    onBlurClose: () => {},
  })
  const current = parseTimeOfDay(value)

  const type = (raw: string) => {
    const next = typeTimeDigits(value, raw)
    onChange(next)
    // The picker follows the typing: hours until they are complete, then the minutes.
    setStep(hasTypedHours(next) ? 'minute' : 'hour')
  }

  const cell = (selected: boolean) => `rounded-lg py-2 text-sm transition-colors ${
    selected ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800'
  }`

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => type(event.target.value)}
        onMouseDown={field.handleMouseDown}
        onFocus={() => field.handleFocus()}
        onClick={() => field.handleClick()}
        onBlur={field.handleBlur}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && field.isOpen) {
            event.preventDefault()
            field.dismiss()
          }
          if (event.key === 'Enter' && field.isOpen) {
            event.preventDefault()
            field.close()
          }
        }}
        placeholder="чч:мм"
        inputMode="numeric"
        maxLength={5}
        className={inputClassName}
      />
      {field.isOpen && (
        <DropdownPanel width="content" className="w-72">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className={step === 'hour' ? 'font-semibold text-slate-200' : 'text-slate-500'}>1. Час</span>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setStep('minute')}
              className={step === 'minute' ? 'font-semibold text-slate-200' : 'text-slate-500 hover:text-slate-300'}
            >
              2. Минуты
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1 text-center">
            {step === 'hour'
              ? TIME_HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(withHour(value, hour))
                    setStep('minute')
                  }}
                  className={cell(current?.hour === hour)}
                >
                  {String(hour).padStart(2, '0')}
                </button>
              ))
              : TIME_MINUTES.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(withMinute(value, minute))
                    field.close()
                  }}
                  className={cell(current?.minute === minute)}
                >
                  :{String(minute).padStart(2, '0')}
                </button>
              ))}
          </div>
          {step === 'minute' && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setStep('hour')}
              className="mt-2 text-xs text-slate-400 hover:text-slate-200"
            >
              ← другой час
            </button>
          )}
        </DropdownPanel>
      )}
    </div>
  )
}
