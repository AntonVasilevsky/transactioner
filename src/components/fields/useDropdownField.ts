import { useCallback, useEffect, useRef, useState } from 'react'
import { isWindowFocusRestore } from '../../utils/windowFocusRestore'

// Shared open/close rules for every field with a drop-down (lists, calendars):
// - a mouse click opens; a click on the field while it is open closes it and
//   restores the value from before opening;
// - keyboard focus (Tab) opens; focus restored by switching back to the app
//   window does not;
// - Escape closes and restores; leaving the field closes;
// - the drop-down scrolls into view when it opens near the window edge.

interface DropdownFieldCallbacks {
  /** Return false to keep the drop-down closed (e.g. a search field that already has text). */
  canOpen?: () => boolean
  onOpen?: () => void
  /** Closed without a choice: second click or Escape. */
  onDismiss?: () => void
  /** Focus left the field while open. Defaults to onDismiss. */
  onBlurClose?: () => void
}

export function useDropdownField(callbacks: DropdownFieldCallbacks = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const isOpenRef = useRef(false)
  // Open state at pointer down; null when the current interaction is not a mouse press.
  const openAtPointerDownRef = useRef<boolean | null>(null)
  const suppressFocusOpenRef = useRef(false)
  const callbacksRef = useRef(callbacks)

  useEffect(() => {
    callbacksRef.current = callbacks
  })

  const setOpen = useCallback((next: boolean) => {
    isOpenRef.current = next
    setIsOpen(next)
  }, [])

  const open = useCallback((beforeOpen?: () => void) => {
    if (isOpenRef.current || callbacksRef.current.canOpen?.() === false) return
    beforeOpen?.()
    callbacksRef.current.onOpen?.()
    setOpen(true)
  }, [setOpen])

  /** Close after a choice was made. */
  const close = useCallback(() => setOpen(false), [setOpen])

  const dismiss = useCallback(() => {
    if (!isOpenRef.current) return
    setOpen(false)
    callbacksRef.current.onDismiss?.()
  }, [setOpen])

  const focusWithoutOpening = useCallback((element: HTMLElement | null) => {
    if (!element) return
    suppressFocusOpenRef.current = true
    element.focus()
    suppressFocusOpenRef.current = false
  }, [])

  const handleMouseDown = useCallback(() => {
    openAtPointerDownRef.current = isOpenRef.current
  }, [])

  const handleFocus = useCallback((beforeOpen?: () => void) => {
    const fromPointer = openAtPointerDownRef.current !== null
    if (isWindowFocusRestore() || fromPointer || suppressFocusOpenRef.current) return
    open(beforeOpen)
  }, [open])

  const handleClick = useCallback((beforeOpen?: () => void) => {
    const wasOpen = openAtPointerDownRef.current ?? isOpenRef.current
    openAtPointerDownRef.current = null
    if (wasOpen) {
      dismiss()
    } else {
      open(beforeOpen)
    }
  }, [dismiss, open])

  const handleBlur = useCallback(() => {
    openAtPointerDownRef.current = null
    if (!isOpenRef.current) return
    setOpen(false)
    const { onBlurClose, onDismiss } = callbacksRef.current
    ;(onBlurClose || onDismiss)?.()
  }, [setOpen])

  // Runs when the drop-down mounts, after the click that opened it has finished,
  // so nothing (like selecting the input text) interrupts the scroll.
  const panelRef = useCallback((node: HTMLElement | null) => {
    if (!node) return
    requestAnimationFrame(() => node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [])

  return {
    isOpen,
    open,
    close,
    dismiss,
    focusWithoutOpening,
    panelRef,
    handleMouseDown,
    handleFocus,
    handleClick,
    handleBlur,
  }
}

export const nextActiveIndex = (current: number, delta: number, count: number) => {
  if (count <= 0) return -1
  if (current < 0) return delta > 0 ? 0 : count - 1
  return Math.min(count - 1, Math.max(0, current + delta))
}
