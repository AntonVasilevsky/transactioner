import { describe, expect, it } from 'vitest'
import { depositAmountMatches, depositSearchWindow, isDepositSearchAmount, resolveMessageTime } from './depositTransferSearch'
import { transferSourceFor } from './explorerNetworks'

const hour = 60 * 60 * 1000

describe('deposit transfer search rules', () => {
  it('searches the last 2 hours, or 2 hours before the message and an hour after it', () => {
    const now = Date.parse('2026-10-15T18:34:00Z')
    expect(depositSearchWindow(now)).toEqual({ startMs: now - 2 * hour, endMs: now })
    const message = Date.parse('2026-10-15T16:12:00Z')
    const window = depositSearchWindow(now, message)
    expect(window).toEqual({ startMs: Date.parse('2026-10-15T14:12:00Z'), endMs: Date.parse('2026-10-15T17:12:00Z') })
    const inside = (transfer: string, searchWindow: { startMs: number, endMs: number }) =>
      Date.parse(transfer) >= searchWindow.startMs && Date.parse(transfer) <= searchWindow.endMs
    // Owner's example 1: the transfer at 14:12:56 UTC, the screenshot sent at 13:12 (UTC−3), two hours late.
    expect(inside('2026-10-15T14:12:56Z', window)).toBe(true)
    // Owner's example 2: the transfer at 17:36:02 UTC (14:36 UTC−3), the message time typed to the hour as 14:00.
    expect(inside('2026-10-16T17:36:02Z', depositSearchWindow(now, Date.parse('2026-10-16T17:00:00Z')))).toBe(true)
  })

  it('reads the message time as the messenger shows it; a time not yet reached today is yesterday', () => {
    const now = new Date(2026, 9, 15, 15, 34)
    expect(resolveMessageTime('13:12', '', now)).toEqual(new Date(2026, 9, 15, 13, 12))
    expect(resolveMessageTime('1312', '', now)).toEqual(new Date(2026, 9, 15, 13, 12))
    expect(resolveMessageTime('22.43', '', now)).toEqual(new Date(2026, 9, 14, 22, 43))
    expect(resolveMessageTime('22:43', '2026-10-15', now)).toEqual(new Date(2026, 9, 15, 22, 43))
    expect(resolveMessageTime('25:00', '', now)).toBeNull()
    expect(resolveMessageTime('abc', '', now)).toBeNull()
  })

  it('matches the typed amount to the cent or to the typed decimals; dust and zero never match', () => {
    expect(depositAmountMatches('25', '25')).toBe(true)
    expect(depositAmountMatches('25.000000', '25,00')).toBe(true)
    expect(depositAmountMatches('25.01', '25')).toBe(false)
    expect(depositAmountMatches('0.00002', '0')).toBe(false)
    expect(depositAmountMatches('0.00002', '25')).toBe(false)
    expect(depositAmountMatches('0.00150000', '0.0015')).toBe(true)
    expect(depositAmountMatches('0.0016', '0.0015')).toBe(false)
    expect(isDepositSearchAmount('$')).toBe(false)
    expect(isDepositSearchAmount('1 500')).toBe(true)
  })

  it('knows which wallets can be searched', () => {
    expect(['USDT TRC20', 'USDT ERC20', 'USDC ERC20', 'USDT BEP20', 'ETH ETH', 'BTC BTC', 'USDC TRC20', 'SKRILL EUR', 'LUXON PAY USD / EUR']
      .map((label) => transferSourceFor(label)?.kind ?? null))
      .toEqual(['tron-token', 'evm-token', 'evm-token', 'bsc-token', 'evm-native', 'bitcoin', null, null, null])
  })
})
