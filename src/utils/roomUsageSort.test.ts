import { describe, expect, it } from 'vitest'
import { sortRoomNamesByUsage, sortRoomProfilesByUsage } from './roomUsageSort'

describe('room usage sort', () => {
  it('puts core rooms first, then rooms with more accounts, then alphabetical', () => {
    const result = sortRoomNamesByUsage(
      ['1win', 'ACR', 'RedStar', 'Basepoker', 'Nexa', 'CoinPoker', 'acr'],
      [
        { roomName: 'CoinPoker', registrationCount: 3 },
        { room_name: 'Basepoker', registration_count: 5 },
      ]
    )

    expect(result).toEqual(['Nexa', 'RedStar', 'Basepoker', 'CoinPoker', '1win', 'ACR'])
  })

  it('matches profiles by display name or room key', () => {
    const profiles = [
      { room_key: 'wptg', display_name: 'WPT Global' },
      { room_key: 'champion-poker', display_name: 'Champion' },
      { room_key: 'acr', display_name: 'ACR' },
    ]

    expect(sortRoomProfilesByUsage(profiles, [{ roomName: 'WPTG', registrationCount: 2 }]).map((profile) => profile.room_key))
      .toEqual(['champion-poker', 'wptg', 'acr'])
  })
})
