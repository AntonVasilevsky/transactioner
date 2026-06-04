import { describe, expect, it } from 'vitest'
import { matchesRoomSearch } from './roomSearch'

describe('room search', () => {
  it('matches rooms by common Cyrillic aliases', () => {
    expect(matchesRoomSearch(['Nexa'], 'некса')).toBe(true)
    expect(matchesRoomSearch(['Champion Poker'], 'чемпион')).toBe(true)
    expect(matchesRoomSearch(['RedStar'], 'ред стар')).toBe(true)
    expect(matchesRoomSearch(['WPT Global'], 'впт')).toBe(true)
  })

  it('matches generic Cyrillic transliteration where aliases are not needed', () => {
    expect(matchesRoomSearch(['TON Poker'], 'тон')).toBe(true)
    expect(matchesRoomSearch(['Grompoker'], 'гром')).toBe(true)
    expect(matchesRoomSearch(['PokerKing'], 'покер кинг')).toBe(true)
  })

  it('does not match unrelated rooms', () => {
    expect(matchesRoomSearch(['Nexa'], 'редстар')).toBe(false)
  })
})
