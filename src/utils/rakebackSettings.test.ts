import { describe, expect, it } from 'vitest'
import {
  loadRakebackExplorerSettings,
  mergeLegacyRakebackWallets,
  rakebackSenderWalletAddresses,
  rakebackSettingsStorageKey,
} from './rakebackSettings'

const tron = 'TH9pR7y4opKeR78jmutCgY4toDVfpFJjgM'
const erc = '0x70AF4652641F9c7D9Ad18168894E87F8bAD997b6'
const bep = '0x7fa4e95b52813d5eefd860d22bf8f19467bc9adc'

describe('rakeback sender wallets', () => {
  it('reads a list saved in browser storage by an older version', () => {
    const storage = { getItem: (key: string) => (key === rakebackSettingsStorageKey ? JSON.stringify({ affiliateWallets: `USDT ERC20 ${erc}` }) : null) }
    expect(loadRakebackExplorerSettings(storage).affiliateWallets).toBe(`USDT ERC20 ${erc}`)
    expect(loadRakebackExplorerSettings({ getItem: () => 'broken' }).affiliateWallets).toBe('')
  })

  it('finds addresses in free text the same way the search does', () => {
    expect([...rakebackSenderWalletAddresses(`USDT TRC20\n${tron}\nUSDT erc20 ${erc} \nUsdt bep20 ${bep}`)])
      .toEqual([tron.toLowerCase(), erc.toLowerCase(), bep])
  })

  it('imports an old list once without losing or duplicating wallets', () => {
    expect(mergeLegacyRakebackWallets('', `USDT TRC20\n${tron}`)).toEqual({ text: `USDT TRC20\n${tron}`, changed: true })
    expect(mergeLegacyRakebackWallets(`USDT TRC20\n${tron}\nUSDT ERC20 ${erc}`, `USDT ERC20 ${erc.toLowerCase()}`))
      .toEqual({ text: `USDT TRC20\n${tron}\nUSDT ERC20 ${erc}`, changed: false })
    expect(mergeLegacyRakebackWallets(`USDT TRC20\n${tron}\n`, `USDT ERC20\n${erc}\nUsdt bep20 ${bep}  \n${tron}`))
      .toEqual({ text: `USDT TRC20\n${tron}\n\n${erc}\nUsdt bep20 ${bep}\n`, changed: true })
    expect(mergeLegacyRakebackWallets(`list ${tron}`, '  ')).toEqual({ text: `list ${tron}`, changed: false })
  })
})
