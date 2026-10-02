import { describe, expect, it } from 'vitest'
import { recentPlayerDescription, sortRecentPlayers } from './recentPlayers'

describe('recent players', () => {
  it('puts recently opened players first and the rest alphabetically', () => {
    const players = [
      { messenger_username: '@zed', last_used_at: 0 },
      { messenger_username: '@anna', last_used_at: 0 },
      { messenger_username: '@old', last_used_at: 100 },
      { messenger_username: '@new', last_used_at: 300 },
    ]

    expect(sortRecentPlayers(players).map((player) => player.messenger_username)).toEqual(['@new', '@old', '@anna', '@zed'])
  })

  it('lists other contacts without repeating the shown name', () => {
    expect(recentPlayerDescription({ messenger_username: '@anton', contact_summary: '@anton,+5491112345678, anton#1' }))
      .toBe('+5491112345678 · anton#1')
    expect(recentPlayerDescription({ messenger_username: '@anton', contact_summary: null })).toBe('')
  })
})
