import { describe, expect, it } from 'vitest'
import { dropdownPlacement } from './dropdownPlacement'

const viewport = { width: 1200, height: 800 }

describe('drop-down placement', () => {
  it('opens below the field, as wide as the field', () => {
    expect(dropdownPlacement({ left: 100, top: 200, bottom: 250, width: 300 }, viewport, 'field', 120)).toEqual({
      left: 100, top: 258, maxHeight: 288, maxWidth: 1092, width: 300,
    })
  })

  it('opens above when the list does not fit below and there is more room above', () => {
    expect(dropdownPlacement({ left: 100, top: 650, bottom: 700, width: 300 }, viewport, 'atLeastField', 200)).toEqual({
      left: 100, bottom: 158, maxHeight: 288, maxWidth: 1092, minWidth: 300,
    })
  })

  it('stays below when the list fits there, even near the bottom', () => {
    const placement = dropdownPlacement({ left: 100, top: 650, bottom: 700, width: 300 }, viewport, 'content', 60)
    expect(placement).toMatchObject({ top: 708, maxHeight: 96 })
    expect(placement.width).toBeUndefined()
  })

  it('never starts outside the window', () => {
    expect(dropdownPlacement({ left: -20, top: 10, bottom: 40, width: 100 }, viewport, 'field', 50).left).toBe(8)
  })
})
