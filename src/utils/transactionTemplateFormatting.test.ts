import { describe, expect, it } from 'vitest'
import {
  championDepositTemplateAmount,
  championWithdrawalTemplateAmount,
  cleanCurrencyNumber,
  euroSymbolAmount
} from './transactionTemplateFormatting'

describe('transaction template amount formatting', () => {
  it('formats Champion deposit manual EUR amounts with the euro symbol', () => {
    expect(championDepositTemplateAmount('500', 'EUR')).toBe('€500')
    expect(championDepositTemplateAmount('EUR 500.00', 'EUR')).toBe('€500.00')
  })

  it('uses converted EUR display amount for Champion deposit manual USD amounts', () => {
    expect(championDepositTemplateAmount('$500', 'USD', '€460.00')).toBe('€460.00')
  })

  it('keeps Champion withdrawal EUR wording unchanged', () => {
    expect(championWithdrawalTemplateAmount('500', 'EUR')).toBe('EUR 500')
    expect(championWithdrawalTemplateAmount('$500', 'USD', 'EUR 460.00')).toBe('EUR 460.00')
  })

  it('cleans common currency prefixes and symbols', () => {
    expect(cleanCurrencyNumber('$500')).toBe('500')
    expect(euroSymbolAmount('USD 500.00')).toBe('€500.00')
  })
})
