import { describe, expect, it } from 'vitest'
import { previousView, registerEscapeBack, runEscapeBack } from './escapeNavigation'

describe('Esc = back', () => {
  it('goes back one level, ending at the player search', () => {
    expect(previousView('roomInfo')).toBe('search')
    expect(previousView('linkVerification')).toBe('search')
    expect(previousView('form')).toBe('search')
    expect(previousView('add')).toBe('search')
    expect(previousView('list')).toBe('search')
    expect(previousView('edit')).toBe('list')
    expect(previousView('search')).toBeNull()
  })

  it('lets the latest open nested screen go back first, and only while it is registered', () => {
    const calls: string[] = []
    const closeSettings = registerEscapeBack({ run: () => calls.push('settings') })
    const closeDialog = registerEscapeBack({ run: () => calls.push('dialog') })

    expect(runEscapeBack()).toBe(true)
    closeDialog()
    expect(runEscapeBack()).toBe(true)
    closeSettings()
    expect(runEscapeBack()).toBe(false)
    expect(calls).toEqual(['dialog', 'settings'])
  })
})
