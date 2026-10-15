import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { dropdownPlacement, type DropdownWidth } from './dropdownPlacement'

export interface FieldOption {
  value: string
  label: string
  description?: string
  /** Extra names used by search (room key, network). */
  searchText?: string[]
  trailing?: ReactNode
}

/**
 * The drop-down of every list and calendar. It is drawn over the whole window, so the next card
 * on the screen cannot cover it (T-0026), and placed by dropdownPlacement next to the field: the
 * nearest positioned element around the place where the panel is rendered (the field wrapper).
 */
export function DropdownPanel({
  children,
  className = '',
  width = 'field',
}: {
  children: ReactNode
  className?: string
  width?: DropdownWidth
}) {
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const place = (event?: Event) => {
      const panel = panelRef.current
      const anchor = anchorRef.current
      const field = anchor?.offsetParent ?? anchor?.parentElement
      if (!panel || !field || event?.target === panel) return
      const placement = dropdownPlacement(
        field.getBoundingClientRect(),
        { width: window.innerWidth, height: window.innerHeight },
        width,
        panel.scrollHeight,
      )
      const px = (value?: number) => (value === undefined ? '' : `${value}px`)
      Object.assign(panel.style, {
        left: px(placement.left),
        top: px(placement.top),
        bottom: px(placement.bottom),
        maxHeight: px(placement.maxHeight),
        maxWidth: px(placement.maxWidth),
        width: px(placement.width),
        minWidth: px(placement.minWidth),
        visibility: 'visible',
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [width])

  return (
    <>
      <span ref={anchorRef} aria-hidden className="pointer-events-none absolute h-0 w-0" />
      {createPortal(
        <div
          ref={panelRef}
          // Keeps focus in the field when the scrollbar or padding is clicked.
          onMouseDown={(event) => event.preventDefault()}
          style={{ visibility: 'hidden' }}
          className={`fixed z-50 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 font-sans text-slate-100 shadow-2xl shadow-slate-950/40 ${className}`}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
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
