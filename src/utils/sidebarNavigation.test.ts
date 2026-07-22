import { describe, expect, it } from 'vitest'
import {
  defaultSidebarNavOrder,
  moveSidebarNavToTarget,
  normalizeSidebarNavOrder,
} from './sidebarNavigation'

describe('sidebar navigation order', () => {
  it('keeps valid saved items once and appends newly introduced items', () => {
    expect(normalizeSidebarNavOrder(['roomInfo', 'search', 'search', 'removed-item'])).toEqual([
      'roomInfo',
      'search',
      'list',
      'add',
      'linkVerification',
    ])
  })

  it('uses the default order when saved data is invalid', () => {
    expect(normalizeSidebarNavOrder(null)).toEqual(defaultSidebarNavOrder)
    expect(normalizeSidebarNavOrder('search,list')).toEqual(defaultSidebarNavOrder)
  })

  it('moves an item immediately when it enters another item', () => {
    const order = normalizeSidebarNavOrder(defaultSidebarNavOrder)

    expect(moveSidebarNavToTarget(order, 'search', 'list')).toEqual([
      'list',
      'search',
      'add',
      'roomInfo',
      'linkVerification',
    ])
    expect(moveSidebarNavToTarget(order, 'linkVerification', 'list')).toEqual([
      'search',
      'linkVerification',
      'list',
      'add',
      'roomInfo',
    ])
  })
})
