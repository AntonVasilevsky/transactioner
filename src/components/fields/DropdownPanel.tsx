import { useEffect, useRef, type ReactNode } from 'react'

export interface FieldOption {
  value: string
  label: string
  description?: string
  /** Extra names used by search (room key, network). */
  searchText?: string[]
  trailing?: ReactNode
}

export function DropdownPanel({
  panelRef,
  children,
  className = '',
}: {
  panelRef: (node: HTMLElement | null) => void
  children: ReactNode
  className?: string
}) {
  return (
    <div
      ref={panelRef}
      // Keeps focus in the field when the scrollbar or padding is clicked.
      onMouseDown={(event) => event.preventDefault()}
      className={`absolute left-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-slate-950/40 ${className || 'right-0'}`}
    >
      {children}
    </div>
  )
}

export function DropdownOptionList({
  options,
  selectedValue,
  activeIndex,
  scrollToActive,
  emptyText,
  onChoose,
  onHover,
}: {
  options: FieldOption[]
  selectedValue: string
  activeIndex: number
  /** Keep the active option visible (keyboard navigation, opening); not on mouse hover. */
  scrollToActive: boolean
  emptyText: string
  onChoose: (option: FieldOption, shiftKey: boolean) => void
  onHover: (index: number) => void
}) {
  if (!options.length) {
    return <div className="px-3 py-4 text-sm text-slate-500">{emptyText}</div>
  }

  return (
    <div role="listbox">
      {options.map((option, index) => (
        <DropdownOption
          key={option.value}
          option={option}
          selected={option.value === selectedValue}
          active={index === activeIndex}
          scrollIntoPanel={scrollToActive && index === activeIndex}
          onChoose={(shiftKey) => onChoose(option, shiftKey)}
          onHover={() => onHover(index)}
        />
      ))}
    </div>
  )
}

function DropdownOption({
  option,
  selected,
  active,
  scrollIntoPanel,
  onChoose,
  onHover,
}: {
  option: FieldOption
  selected: boolean
  active: boolean
  scrollIntoPanel: boolean
  onChoose: (shiftKey: boolean) => void
  onHover: () => void
}) {
  const ref = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const element = ref.current
    const panel = element?.offsetParent
    if (!scrollIntoPanel || !element || !(panel instanceof HTMLElement)) return
    // Scrolls only the list itself, never the page.
    if (element.offsetTop < panel.scrollTop) {
      panel.scrollTop = element.offsetTop
    } else if (element.offsetTop + element.offsetHeight > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = element.offsetTop + element.offsetHeight - panel.clientHeight
    }
  }, [scrollIntoPanel])

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={onHover}
      onClick={(event) => onChoose(event.shiftKey)}
      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
        selected
          ? 'bg-blue-600/20 text-blue-200'
          : active
            ? 'bg-slate-800 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{option.label}</span>
        {option.trailing}
      </div>
      {option.description && <div className="text-xs text-slate-500">{option.description}</div>}
    </button>
  )
}
