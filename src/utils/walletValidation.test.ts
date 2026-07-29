import { describe, expect, it } from 'vitest'
import {
  getWalletAddressValidationError,
  isLikelyTransactionReference,
} from './walletValidation'

describe('wallet transaction-reference validation', () => {
  it('rejects common transaction hashes and explorer transaction links', () => {
    expect(isLikelyTransactionReference(
      '0xdf8f94418d9cda8e30fd00ad8b1e91a7708ec841691ed708f49ebc438a7e325a'
    )).toBe(true)
    expect(isLikelyTransactionReference(
      'df8f94418d9cda8e30fd00ad8b1e91a7708ec841691ed708f49ebc438a7e325a'
    )).toBe(true)
    expect(isLikelyTransactionReference(
      'https://etherscan.io/tx/0xdf8f94418d9cda8e30fd00ad8b1e91a7708ec841691ed708f49ebc438a7e325a'
    )).toBe(true)
    expect(isLikelyTransactionReference(
      'https://tronscan.org/#/transaction/df8f94418d9cda8e30fd00ad8b1e91a7708ec841691ed708f49ebc438a7e325a'
    )).toBe(true)
    expect(getWalletAddressValidationError(
      '0xdf8f94418d9cda8e30fd00ad8b1e91a7708ec841691ed708f49ebc438a7e325a'
    )).toContain('хеш')
  })

  it('accepts normal wallet addresses and payment account identifiers', () => {
    expect(isLikelyTransactionReference(
      '0x7CaCB54427ae9Df715F98a03E067dFadc48eD72d'
    )).toBe(false)
    expect(isLikelyTransactionReference(
      'TUL2B5WWhH5CAwwTcgJNXY5qBF2XdPcc8D'
    )).toBe(false)
    expect(isLikelyTransactionReference(
      'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t'
    )).toBe(false)
    expect(isLikelyTransactionReference('pokerdeals.sofia@gmail.com')).toBe(false)
    expect(getWalletAddressValidationError('')).toBeNull()
  })
})
