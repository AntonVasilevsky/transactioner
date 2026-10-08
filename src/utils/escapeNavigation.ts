/**
 * Esc = "Назад", one rule for the whole app (owner, 2026-10-05). The order of checks:
 * 1. a list, calendar or other control already handled Esc (event.defaultPrevented);
 * 2. focus is in a text field — the first Esc only leaves the field, so typed data is not lost;
 * 3. a screen inside a section registered its own "back" (room settings → room info);
 * 4. otherwise the section goes back by previousView, ending at "Найти игрока".
 */
export type AppView = 'search' | 'add' | 'form' | 'list' | 'edit' | 'roomInfo' | 'linkVerification' | 'quickReplies'

export const previousView = (view: AppView): AppView | null => {
  if (view === 'search') return null
  if (view === 'edit') return 'list'
  return 'search'
}

const nonTextInputTypes = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'])

export const isTextEntry = (element: Element | null) => {
  if (!element) return false
  if (element instanceof HTMLTextAreaElement) return !element.readOnly
  if (element instanceof HTMLInputElement) return !element.readOnly && !nonTextInputTypes.has(element.type)
  return element instanceof HTMLElement && element.isContentEditable
}

type BackHandler = { run: () => void }
const backHandlers: BackHandler[] = []

/** Registers a nested screen's "back"; the latest active one runs first. Returns the unregister function. */
export const registerEscapeBack = (handler: BackHandler) => {
  backHandlers.push(handler)
  return () => {
    const index = backHandlers.lastIndexOf(handler)
    if (index !== -1) backHandlers.splice(index, 1)
  }
}

export const runEscapeBack = () => {
  const top = backHandlers[backHandlers.length - 1]
  if (!top) return false
  top.run()
  return true
}
