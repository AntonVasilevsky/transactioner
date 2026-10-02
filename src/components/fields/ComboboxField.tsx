import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { DropdownOptionList, DropdownPanel, type FieldOption } from './DropdownPanel'
import { nextActiveIndex, useDropdownField } from './useDropdownField'

interface ComboboxFieldProps {
  value: string
  options: FieldOption[]
  onSelect: (value: string, event: { shiftKey: boolean }) => void
  /** Defaults to a case-insensitive substring match on the label. */
  matches?: (option: FieldOption, query: string) => boolean
  /** Typed text that matches no option is kept as the value when focus leaves. */
  allowCustomValue?: boolean
  placeholder?: string
  emptyText?: string
  /** Focus the field when it mounts, without opening the list. */
  autoFocus?: boolean
  className?: string
  inputClassName?: string
}

const defaultMatches = (option: FieldOption, query: string) => option.label.toLowerCase().includes(query.toLowerCase())

export default function ComboboxField({
  value,
  options,
  onSelect,
  matches = defaultMatches,
  allowCustomValue = false,
  placeholder,
  emptyText = 'Ничего не найдено',
  autoFocus = false,
  className = '',
  inputClassName = 'rounded-xl py-3 focus:border-blue-500',
}: ComboboxFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [scrollToActive, setScrollToActive] = useState(false)
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed || trimmed === selectedLabel) return options
    return options.filter((option) => matches(option, trimmed))
  }, [matches, options, query, selectedLabel])

  const field = useDropdownField({
    onOpen: () => {
      setQuery(selectedLabel)
      setScrollToActive(true)
      setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    },
    onBlurClose: () => {
      const typed = query.trim()
      if (!allowCustomValue || !typed || typed === selectedLabel) return
      const exact = options.find((option) => option.label.toLowerCase() === typed.toLowerCase())
      onSelect(exact ? exact.value : typed, { shiftKey: false })
    },
  })

  useEffect(() => {
    if (autoFocus) field.focusWithoutOpening(inputRef.current)
    // Only on mount, like the native autoFocus attribute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = (option: FieldOption, shiftKey: boolean) => {
    field.close()
    onSelect(option.value, { shiftKey })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
      setActiveIndex((current) => nextActiveIndex(current, event.key === 'ArrowDown' ? 1 : -1, filteredOptions.length))
      return
    }
    if (event.key === 'Enter' && field.isOpen) {
      const option = filteredOptions[activeIndex] || filteredOptions[0]
      if (!option) return
      event.preventDefault()
      choose(option, event.shiftKey)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={field.isOpen ? query : selectedLabel}
          role="combobox"
          aria-expanded={field.isOpen}
          onChange={(event) => {
            field.open()
            setQuery(event.target.value)
            setScrollToActive(true)
            setActiveIndex(0)
          }}
          onMouseDown={field.handleMouseDown}
          onFocus={(event) => {
            const input = event.currentTarget
            field.handleFocus(() => input.select())
          }}
          onClick={(event) => {
            const input = event.currentTarget
            field.handleClick(() => input.select())
          }}
          onBlur={field.handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full border border-slate-700 bg-slate-900 pl-9 pr-3 text-slate-100 placeholder-slate-600 outline-none ${inputClassName}`}
        />
      </div>
      {field.isOpen && (
        <DropdownPanel panelRef={field.panelRef}>
          <DropdownOptionList
            options={filteredOptions}
            selectedValue={value}
            activeIndex={activeIndex}
            scrollToActive={scrollToActive}
            emptyText={emptyText}
            onChoose={choose}
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
