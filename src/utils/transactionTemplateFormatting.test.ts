import { describe, expect, it } from 'vitest'
import {
  championDepositTemplateAmount,
  championWithdrawalTemplateAmount,
  cleanCurrencyNumber,
  currencySymbolAmount,
  defaultAmountCurrencyForRoom,
  euroSymbolAmount,
  resolveRoomPaymentWarning,
} from './transactionTemplateFormatting'

const roomPaymentContext = {
  profiles: [
    { room_key: 'champion-poker', display_name: 'Champion Poker' },
    { room_key: 'nexa', display_name: 'Nexa' },
  ],
  paymentMethods: [
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Deposit' as const, method_name: 'USDT TRC20', currency: 'USDT', network: 'TRC20', limits_text: '200 EUR', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Deposit' as const, method_name: 'USDC ERC20', currency: 'USDC', network: 'ERC20', limits_text: '10 EUR', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Deposit' as const, method_name: 'BTC', currency: 'BTC', network: 'BTC', limits_text: '', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Deposit' as const, method_name: 'Skrill', currency: '', network: 'EUR', limits_text: '10 EUR', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Withdrawal' as const, method_name: 'BTC / TRC20 / ERC20', currency: '', network: '', limits_text: '', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Withdrawal' as const, method_name: 'USDT TRC20', currency: 'USDT', network: 'TRC20', limits_text: '200 EUR', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Withdrawal' as const, method_name: 'USDT ERC20', currency: 'USDT', network: 'ERC20', limits_text: '10 EUR', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Withdrawal' as const, method_name: 'USDC ERC20', currency: 'USDC', network: 'ERC20', limits_text: '10 EUR', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', operation_type: 'Withdrawal' as const, method_name: 'BTC', currency: 'BTC', network: '', limits_text: '500 EUR', is_active: 1 },
    { room_key: 'nexa', deal_type: 'Agent', operation_type: 'Deposit' as const, method_name: 'USDT BEP20', currency: 'USDT', network: 'BEP20', limits_text: '50 USDT', is_active: 1 },
  ],
  walletOptions: [
    { room_key: 'champion-poker', deal_type: 'Agent', currency: 'USDT', network: 'TRC20', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', currency: 'USDT', network: 'ERC20', is_active: 1 },
    { room_key: 'champion-poker', deal_type: 'Agent', currency: 'USDC', network: 'ERC20', is_active: 1 },
    { room_key: 'nexa', deal_type: 'Agent', currency: 'USDT', network: 'BEP20', is_active: 1 },
  ],
}

describe('transaction template amount formatting', () => {
  it('formats Champion deposit manual EUR amounts with the euro symbol', () => {
    expect(championDepositTemplateAmount('500', 'EUR')).toBe('€500')
    expect(championDepositTemplateAmount('EUR 500.00', 'EUR')).toBe('€500.00')
  })

  it('uses converted EUR display amount for Champion deposit manual USD amounts', () => {
    expect(championDepositTemplateAmount('$500', 'USD', '€460.00')).toBe('€460.00')
  })

  it('keeps resolved crypto amounts unchanged for Champion deposits', () => {
    expect(championDepositTemplateAmount('0.00939351 BTC', 'EUR')).toBe('0.00939351 BTC')
  })

  it('keeps Champion withdrawal EUR wording unchanged', () => {
    expect(championWithdrawalTemplateAmount('500', 'EUR')).toBe('EUR 500')
    expect(championWithdrawalTemplateAmount('$500', 'USD', 'EUR 460.00')).toBe('EUR 460.00')
  })

  it('cleans common currency prefixes and symbols', () => {
    expect(cleanCurrencyNumber('$500')).toBe('500')
    expect(euroSymbolAmount('USD 500.00')).toBe('€500.00')
  })

  it('formats RedStar amount values with the selected currency symbol', () => {
    expect(currencySymbolAmount('500', 'USD')).toBe('$500')
    expect(currencySymbolAmount('500', 'EUR')).toBe('€500')
    expect(currencySymbolAmount('$500', 'EUR')).toBe('€500')
    expect(currencySymbolAmount('EUR 500', 'USD')).toBe('$500')
    expect(currencySymbolAmount('0.00939351 BTC', 'USD')).toBe('0.00939351 BTC')
  })

  it('uses USD for RedStar deposits and EUR for RedStar withdrawals', () => {
    expect(defaultAmountCurrencyForRoom('RedStar', 'Deposit')).toBe('USD')
    expect(defaultAmountCurrencyForRoom('RedStar', 'Withdrawal')).toBe('EUR')
    expect(defaultAmountCurrencyForRoom('Champion Poker', 'Deposit')).toBe('EUR')
    expect(defaultAmountCurrencyForRoom('Nexa', 'Deposit')).toBe('USD')
  })

  it('warns when a room payment amount is below editable method limits', () => {
    expect(resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Champion Poker',
      operationType: 'Deposit',
      method: 'USDT TRC20',
      amount: '€199',
    })).toContain('200 EUR')
    expect(resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Nexa',
      operationType: 'Deposit',
      method: 'USDT BEP20',
      amount: '49 USDT',
    })).toContain('50 USDT')
  })

  it('applies editable broad room limits to matched deposit wallets', () => {
    expect(resolveRoomPaymentWarning({
      profiles: [{ room_key: 'nexa', display_name: 'Nexa' }],
      paymentMethods: [{
        room_key: 'nexa',
        deal_type: 'Agent',
        operation_type: 'Deposit',
        method_name: 'USDT / USDC / BTC',
        currency: 'USDT / USDC / BTC',
        network: 'TRC20 / ERC20 / BEP20 / BTC',
        limits_text: '100 eur',
        is_active: 1,
      }],
      walletOptions: [{
        room_key: 'nexa',
        deal_type: 'Agent',
        currency: 'USDT',
        network: 'TRC20',
        is_active: 1,
      }],
      roomName: 'Nexa',
      operationType: 'Deposit',
      method: 'USDT TRC20',
      amount: '$50',
    })).toContain('100 eur')
  })

  it('warns when a room operation uses an unavailable method', () => {
    const warning = resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Champion Poker',
      operationType: 'Deposit',
      method: 'USDT BEP20',
      amount: '€500',
    })

    expect(warning).toContain('Недоступный метод депозита Champion Poker')
    expect(warning).toContain('USDT BEP20')
    expect(warning).toContain('USDT TRC20')
  })

  it('accepts broad editable withdrawal method rows', () => {
    expect(resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Champion Poker',
      operationType: 'Withdrawal',
      method: 'USDT TRC20',
      amount: '€300',
    })).toBe('')
  })

  it('checks Champion withdrawal minimums per coin and network', () => {
    const warning = resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Champion Poker',
      operationType: 'Withdrawal',
      method: 'USDT TRC20',
      amount: '€100',
    })

    expect(warning).toContain('Минимальная сумма вывода Champion Poker')
    expect(warning).toContain('USDT TRC20')
    expect(warning).toContain('200 EUR')
  })

  it('rejects withdrawal networks that are not available as deposit methods', () => {
    const warning = resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Champion Poker',
      operationType: 'Withdrawal',
      method: 'USDT BEP20',
      amount: '€500',
    })

    expect(warning).toContain('Недоступная сеть вывода Champion Poker')
    expect(warning).toContain('Попросите другой кошелек')
  })

  it('asks to specify the coin when a withdrawal network has multiple limits', () => {
    const warning = resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Champion Poker',
      operationType: 'Withdrawal',
      method: 'ERC20',
      amount: '€5',
    })

    expect(warning).toContain('Укажите монету для вывода Champion Poker')
    expect(warning).toContain('USDT ERC20')
    expect(warning).toContain('USDC ERC20')
  })

  it('does not compare crypto-denominated room deposits as EUR', () => {
    expect(resolveRoomPaymentWarning({
      ...roomPaymentContext,
      roomName: 'Champion Poker',
      operationType: 'Withdrawal',
      method: 'BTC',
      amount: '0.00939351 BTC',
    })).toBe('')
  })
})
