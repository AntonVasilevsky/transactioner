import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWindowFocusRestoreGuard } from './windowFocusRestore'

describe('createWindowFocusRestoreGuard', () => {
  let target: EventTarget

  beforeEach(() => {
    vi.useFakeTimers()
    target = new EventTarget()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('treats focus without a window switch as user intent', () => {
    const guard = createWindowFocusRestoreGuard(target)
    expect(guard.consumeFocusRestore()).toBe(false)
  })

  it('flags the first focus after the window was re-activated', () => {
    const guard = createWindowFocusRestoreGuard(target)
    target.dispatchEvent(new Event('blur'))
    target.dispatchEvent(new Event('focus'))

    expect(guard.consumeFocusRestore()).toBe(true)
    expect(guard.consumeFocusRestore()).toBe(false)
  })

  it('flags a restored focus that arrives before the window focus event', () => {
    const guard = createWindowFocusRestoreGuard(target)
    target.dispatchEvent(new Event('blur'))

    expect(guard.consumeFocusRestore()).toBe(true)
  })

  it('expires when nothing is re-focused after activation', () => {
    const guard = createWindowFocusRestoreGuard(target)
    target.dispatchEvent(new Event('blur'))
    target.dispatchEvent(new Event('focus'))
    vi.advanceTimersByTime(200)

    expect(guard.consumeFocusRestore()).toBe(false)
  })

  it.each(['pointerdown', 'keydown'])('treats focus after %s as user intent', (type) => {
    const guard = createWindowFocusRestoreGuard(target)
    target.dispatchEvent(new Event('blur'))
    target.dispatchEvent(new Event('focus'))
    target.dispatchEvent(new Event(type))

    expect(guard.consumeFocusRestore()).toBe(false)
  })

  it('stops listening after dispose', () => {
    const guard = createWindowFocusRestoreGuard(target)
    guard.dispose()
    target.dispatchEvent(new Event('blur'))

    expect(guard.consumeFocusRestore()).toBe(false)
  })
})
