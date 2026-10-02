import { describe, expect, it } from 'vitest'
import { nextActiveIndex } from './useDropdownField'

describe('nextActiveIndex', () => {
  it('moves within the list and stops at the ends', () => {
    expect(nextActiveIndex(0, 1, 3)).toBe(1)
    expect(nextActiveIndex(2, 1, 3)).toBe(2)
    expect(nextActiveIndex(0, -1, 3)).toBe(0)
  })

  it('starts from the edge when nothing is active', () => {
    expect(nextActiveIndex(-1, 1, 3)).toBe(0)
    expect(nextActiveIndex(-1, -1, 3)).toBe(2)
    expect(nextActiveIndex(0, 1, 0)).toBe(-1)
  })
})
