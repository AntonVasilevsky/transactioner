// When the app window becomes active again, Chromium re-focuses the element that
// was focused before the switch. Inputs that open a picker on focus must not treat
// that automatic focus as the user's intent, otherwise the picker pops up every
// time the operator returns from a browser or messenger.

const RESTORE_WINDOW_MS = 150

export interface WindowFocusRestoreGuard {
  /** Returns true once for a focus event caused by window re-activation. */
  consumeFocusRestore: () => boolean
  dispose: () => void
}

export const createWindowFocusRestoreGuard = (target: EventTarget): WindowFocusRestoreGuard => {
  let restorePending = false
  let clearTimer: ReturnType<typeof setTimeout> | undefined

  const cancelClear = () => {
    if (clearTimer !== undefined) clearTimeout(clearTimer)
    clearTimer = undefined
  }

  const handleWindowBlur = () => {
    cancelClear()
    restorePending = true
  }

  // Covers the case when nothing was focused before the switch.
  const handleWindowFocus = () => {
    cancelClear()
    clearTimer = setTimeout(() => {
      restorePending = false
      clearTimer = undefined
    }, RESTORE_WINDOW_MS)
  }

  // Any real user input means the next focus is intentional.
  const handleUserInput = () => {
    cancelClear()
    restorePending = false
  }

  target.addEventListener('blur', handleWindowBlur)
  target.addEventListener('focus', handleWindowFocus)
  target.addEventListener('pointerdown', handleUserInput, true)
  target.addEventListener('keydown', handleUserInput, true)

  return {
    consumeFocusRestore: () => {
      if (!restorePending) return false
      restorePending = false
      cancelClear()
      return true
    },
    dispose: () => {
      cancelClear()
      target.removeEventListener('blur', handleWindowBlur)
      target.removeEventListener('focus', handleWindowFocus)
      target.removeEventListener('pointerdown', handleUserInput, true)
      target.removeEventListener('keydown', handleUserInput, true)
    }
  }
}

const windowGuard = typeof window === 'undefined' ? undefined : createWindowFocusRestoreGuard(window)

export const isWindowFocusRestore = () => windowGuard?.consumeFocusRestore() ?? false
