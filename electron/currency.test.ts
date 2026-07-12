import { describe, expect, it } from 'vitest'
import { formatMoneyAmount, parseCurrencyAmount } from './currency'

describe('currency helpers', () => {
  it('parses typed currency amounts', () => {
    expect(parseCurrencyAmount('$15.43')).toBe(15.43)
    expect(parseCurrencyAmount('USD 15,43')).toBe(15.43)
    expect(parseCurrencyAmount('1,234.56')).toBe(1234.56)
  })

  it('formats money amounts with cents', () => {
    expect(formatMoneyAmount(15.4)).toBe('15.40')
    expect(formatMoneyAmount(15)).toBe('15')
  })
})
