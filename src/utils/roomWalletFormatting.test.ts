import { describe, expect, it } from 'vitest'
import {
  localizeRoomWalletFeeText,
  roomWalletCopyText,
  roomWalletDisplayTitle,
  roomWalletListTitle,
  roomSingleWalletCopyText,
  isTranslatedRoomWalletComment,
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
      .toBe('Champion Poker — billeteras de depósito')
  })

  it('uses one heading form in every language, singular for one wallet', () => {
    expect(['RU', 'EN', 'ES'].map((language) => roomWalletListTitle('Nexa', language as RoomLanguage))).toEqual([
      'Nexa — депозитные кошельки',
      'Nexa — deposit wallets',
      'Nexa — billeteras de depósito',
    ])
    expect(['RU', 'EN', 'ES'].map((language) => roomWalletListTitle('Nexa', language as RoomLanguage, 1))).toEqual([
      'Nexa — кошелёк для депозита',
      'Nexa — deposit wallet',
      'Nexa — billetera de depósito',
    ])
    expect(roomSingleWalletCopyText('Nexa', wallet({ fee_text: '' }), method('через нас, p2p'), 'EN'))
      .toBe('Nexa — deposit wallet\n\nBTC BTC (through us, P2P)\nbc1champion')
  })

  it('translates operator phrases added with RU / EN / ES and tells which comments still need it', () => {
    const phrases = [{ RU: 'только через нас', EN: 'only through us', ES: 'solo a través de nosotros' }]
    expect(localizeRoomWalletFeeText('Только через нас', 'ES', phrases)).toBe('solo a través de nosotros')
    expect(localizeRoomWalletFeeText('only through us', 'RU', phrases)).toBe('только через нас')
    expect(roomSingleWalletCopyText('Champion Poker', wallet({ fee_text: '' }), method('только через нас'), 'EN', phrases))
      .toBe('Champion Poker — deposit wallet\n\nBTC BTC (only through us)\nbc1champion')
    expect(isTranslatedRoomWalletComment('только через нас', phrases)).toBe(true)
    expect(isTranslatedRoomWalletComment('2% комиссия')).toBe(true)
    expect(isTranslatedRoomWalletComment('без комиссии')).toBe(true)
    expect(isTranslatedRoomWalletComment('')).toBe(true)
    expect(isTranslatedRoomWalletComment('только через нас')).toBe(false)
  })
})
