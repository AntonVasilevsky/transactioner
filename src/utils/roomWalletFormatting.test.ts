import { describe, expect, it } from 'vitest'
import {
  localizeRoomWalletFeeText,
  roomWalletCopyText,
  roomWalletDisplayTitle,
  roomWalletListTitle,
} from './roomWalletFormatting'

const wallet = (
  overrides: Partial<RoomWalletInfo> = {}
): RoomWalletInfo => ({
  id: 1,
  room_key: 'champion-poker',
  deal_type: 'Agent',
  currency: 'BTC',
  network: 'BTC',
  wallet_address: 'bc1champion',
  is_active: 1,
  sort_order: 10,
  ...overrides,
})

const method = (
  feeText: string
): RoomPaymentMethodInfo => ({
  id: 1,
  room_key: 'champion-poker',
  deal_type: 'Agent',
  operation_type: 'Deposit',
  method_name: 'BTC',
  currency: 'BTC',
  network: 'BTC',
  fee_text: feeText,
  sort_order: 10,
  is_active: 1,
})

describe('room wallet formatting', () => {
  it('localizes the no-fee comment for every wallet language', () => {
    const noFeeMethod = method('без комиссии')

    expect(roomWalletDisplayTitle(wallet(), noFeeMethod, 'RU')).toBe('BTC BTC (без комиссии)')
    expect(roomWalletDisplayTitle(wallet(), noFeeMethod, 'EN')).toBe('BTC BTC (no fee)')
    expect(roomWalletDisplayTitle(wallet(), noFeeMethod, 'ES')).toBe('BTC BTC (sin comisión)')
  })

  it.each([
    ['1% комиссия', 'EN', '1% fee'],
    ['1% комиссия', 'ES', '1% de comisión'],
    ['уточнить перед переводом', 'EN', 'confirm before transferring'],
    ['уточнить перед переводом', 'ES', 'confirmar antes de transferir'],
    ['через нас, p2p', 'EN', 'through us, P2P'],
    ['через нас, p2p', 'ES', 'a través de nosotros, P2P'],
  ] as const)('localizes %s into %s', (feeText, language, expected) => {
    expect(localizeRoomWalletFeeText(feeText, language)).toBe(expected)
  })

  it('keeps language-neutral and unknown comments unchanged', () => {
    expect(localizeRoomWalletFeeText('2%', 'EN')).toBe('2%')
    expect(localizeRoomWalletFeeText('max 3k', 'ES')).toBe('max 3k')
  })

  it('uses the method comment before the wallet fallback in copied text', () => {
    expect(roomWalletCopyText(
      wallet({ fee_text: '2%' }),
      method('без комиссии'),
      'EN'
    )).toBe('BTC BTC (no fee)\nbc1champion')
  })

  it('localizes the wallet fallback and the list title', () => {
    expect(roomWalletCopyText(
      wallet({ fee_text: 'без комиссии' }),
      undefined,
      'ES'
    )).toBe('BTC BTC (sin comisión)\nbc1champion')
    expect(roomWalletListTitle('Champion Poker', 'ES'))
      .toBe('Champion Poker - billeteras de depósito')
  })
})
