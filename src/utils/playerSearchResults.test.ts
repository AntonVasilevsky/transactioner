import { describe, expect, it } from 'vitest'
import { toPlayerSearchResults } from './playerSearchResults'

const playerPayload = (messengerUsername: string): PlayerPayload => ({
  player: {
    messenger_username: messengerUsername,
    contact_method: 'TG'
  },
  accounts: []
})

describe('toPlayerSearchResults', () => {
  it('preserves the relevance order returned by player search', () => {
    const exactChat = playerPayload('T H')
    const alphabeticalDistractor = playerPayload('@alxefms')

    expect(toPlayerSearchResults([
      exactChat,
      alphabeticalDistractor
    ])).toEqual([
      exactChat,
      alphabeticalDistractor
    ])
  })
})
