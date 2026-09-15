import { describe, expect, it } from 'vitest'
import {
  completedMonthLabelsForRange,
  composeCryptoRakebackTemplate,
  composeStatsRequestTemplate,
  currentMonthRange,
  previousMonthRange,
  trailingMonthRange,
} from './rakeback'

describe('rakeback period helpers', () => {
  const now = new Date(2026, 8, 15)

  it('defaults crypto searches to the current month', () => {
    expect(currentMonthRange(now)).toEqual({
      from: '2026-09-01',
      to: '2026-09-15',
    })
  })

  it('defaults stats requests to the previous completed month', () => {
    expect(previousMonthRange(now)).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    })
  })

  it('formats only completed months for a broad stats range', () => {
    expect(completedMonthLabelsForRange('2026-06-01', '2026-09-15', now)).toEqual([
      'июнь',
      'июль',
      'август',
    ])
  })

  it('builds trailing month ranges for rakeback payout transaction search', () => {
    expect(trailingMonthRange(1, now)).toEqual({
      from: '2026-09-01',
      to: '2026-09-15',
    })
    expect(trailingMonthRange(2, now)).toEqual({
      from: '2026-08-01',
      to: '2026-09-15',
    })
    expect(trailingMonthRange(3, now)).toEqual({
      from: '2026-07-01',
      to: '2026-09-15',
    })
  })
})

describe('rakeback templates', () => {
  it('composes a stats request from the selected account and completed months', () => {
    expect(composeStatsRequestTemplate({
      account: {
        roomName: 'Nexa',
        roomUsername: 'Melius',
        roomPlayerId: '2317219',
        email: 'samcx88@gmail.com',
      },
      from: '2026-06-01',
      to: '2026-09-15',
    })).toContain('Nexa\nMelius / 2317219 / samcx88@gmail.com\n\nЗапросить статы за июнь, июль, август.')
  })

  it('composes a crypto template from selected transactions without wallet or period', () => {
    expect(composeCryptoRakebackTemplate({
      amount: '',
      transaction: '',
      transactions: [
        { amount: '206', date: '10.08.2026', explorerUrl: 'https://etherscan.io/tx/0xabc' },
        { amount: '150.5', date: '11.08.2026', explorerUrl: 'https://etherscan.io/tx/0xdef' },
      ],
    })).toBe(`Rakeback payment
Amount: 206
Date: 10.08.2026
TX: https://etherscan.io/tx/0xabc

Rakeback payment
Amount: 150.5
Date: 11.08.2026
TX: https://etherscan.io/tx/0xdef`)
  })
})
