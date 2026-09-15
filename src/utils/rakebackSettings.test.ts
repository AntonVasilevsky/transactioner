import { describe, expect, it } from 'vitest'
import {
  loadRakebackExplorerSettings,
  rakebackSettingsStorageKey,
  updateRakebackExplorerSettings,
} from './rakebackSettings'

const createMemoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('rakeback explorer settings', () => {
  it('persists affiliate wallets immediately when settings change', () => {
    const storage = createMemoryStorage()
    const next = updateRakebackExplorerSettings(storage, { affiliateWallets: '' }, {
      affiliateWallets: 'USDT ERC20 0x70af4652641f9c7d9ad18168894e87f8bad997b6',
    })

    expect(next.affiliateWallets).toContain('0x70af')
    expect(storage.getItem(rakebackSettingsStorageKey)).toContain('0x70af')
    expect(loadRakebackExplorerSettings(storage).affiliateWallets).toContain('0x70af')
  })
})
