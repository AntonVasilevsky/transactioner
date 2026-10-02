import { useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { DropdownOptionList, DropdownPanel, type FieldOption } from './DropdownPanel'
import { nextActiveIndex, useDropdownField } from './useDropdownField'

interface SelectFieldProps {
  value: string
  options: FieldOption[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  buttonClassName?: string
  ariaLabel?: string
}

// Replaces the native <select>: same list look and open/close rules as ComboboxField.
export default function SelectField({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Выбрать',
  className = '',
  buttonClassName = 'rounded-xl py-3 focus:border-blue-500',
  ariaLabel,
}: SelectFieldProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [scrollToActive, setScrollToActive] = useState(false)
  const selected = options.find((option) => option.value === value)
  const field = useDropdownField({
    onOpen: () => {
      setScrollToActive(true)
      setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    },
  })

  const choose = (option: FieldOption) => {
    field.close()
    if (option.value !== value) onChange(option.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && field.isOpen) {
      event.preventDefault()
      field.dismiss()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!field.isOpen) {
        field.open()
        return
      }
      setScrollToActive(true)
      setActiveIndex((current) => nextActiveIndex(current, event.key === 'ArrowDown' ? 1 : -1, options.length))
      return
    }
    // Enter/Space on a closed field fall through to the native button click.
    if (event.key === 'Enter' && field.isOpen) {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) choose(option)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={field.isOpen}
        aria-label={ariaLabel}
        onMouseDown={field.handleMouseDown}
        onFocus={() => field.handleFocus()}
        onClick={() => field.handleClick()}
        onBlur={field.handleBlur}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 border border-slate-700 bg-slate-900 px-3 text-left text-slate-100 outline-none disabled:cursor-not-allowed disabled:text-slate-500 ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-500'}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${field.isOpen ? 'rotate-180' : ''}`} />
      </button>
      {field.isOpen && (
        <DropdownPanel panelRef={field.panelRef} className="right-0 min-w-max">
          <DropdownOptionList
            options={options}
            selectedValue={value}
            activeIndex={activeIndex}
            scrollToActive={scrollToActive}
            emptyText="Нет вариантов"
            onChoose={(option) => choose(option)}
            onHover={(index) => {
              setScrollToActive(false)
              setActiveIndex(index)
            }}
          />
        </DropdownPanel>
      )}
    </div>
  )
}
