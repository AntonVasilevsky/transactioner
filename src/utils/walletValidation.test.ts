import { describe, expect, it } from 'vitest'
import {
  getTransactionInputWarning,
  getWalletAddressValidationError,
  getWalletNetworkValidationWarning,
  isCryptoWalletNetwork,
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

describe('wallet network validation', () => {
  it('detects crypto and non-crypto rakeback wallet types', () => {
    expect(isCryptoWalletNetwork('USDT TRC20')).toBe(true)
    expect(isCryptoWalletNetwork('BTC')).toBe(true)
    expect(isCryptoWalletNetwork('Skrill')).toBe(false)
    expect(isCryptoWalletNetwork('Luxon Pay')).toBe(false)
  })

  it('rejects addresses that do not match the selected network family', () => {
    expect(getWalletNetworkValidationWarning(
      '0x7CaCB54427ae9Df715F98a03E067dFadc48eD72d',
      'USDT TRC20'
    )).toContain('TRC20')
    expect(getWalletNetworkValidationWarning(
      'TUL2B5WWhH5CAwwTcgJNXY5qBF2XdPcc8D',
      'USDT ERC20'
    )).toContain('ERC20')
    expect(getWalletNetworkValidationWarning(
      '0xdf8f94418d9cda8e30fd00ad8b1e91a7708ec841691ed708f49ebc438a7e325a',
      'USDT ERC20'
    )).toContain('хеш')
  })

  it('accepts matching wallet and network families', () => {
    expect(getWalletNetworkValidationWarning(
      'TUL2B5WWhH5CAwwTcgJNXY5qBF2XdPcc8D',
      'USDT TRC20'
    )).toBeNull()
    expect(getWalletNetworkValidationWarning(
      '0x7CaCB54427ae9Df715F98a03E067dFadc48eD72d',
      'USDT BEP20'
    )).toBeNull()
    expect(getWalletNetworkValidationWarning(
      'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t',
      'BTC'
    )).toBeNull()
  })
})

describe('deposit transaction input warning', () => {
  const hash = 'a294ecb85e35827f36bb712b4475bc95430daec59ab114e74d608278813e9f53'

  it('stays silent for a full hash or a transaction link, so the lookup runs', () => {
    expect(getTransactionInputWarning('')).toBeNull()
    expect(getTransactionInputWarning(hash)).toBeNull()
    expect(getTransactionInputWarning(`0x${hash}`)).toBeNull()
    expect(getTransactionInputWarning(`https://etherscan.io/tx/0x${hash}`)).toBeNull()
    expect(getTransactionInputWarning(`https://tronscan.org/#/transaction/${hash}`)).toBeNull()
  })

  it('flags wallet addresses and address links', () => {
    for (const value of [
      'https://etherscan.io/address/0x563715a0773d8Bc54F0014D19BfB586f353a80f6',
      'https://tronscan.org/#/address/TQrY8tryqsYVCYS3MFbtffiPp2ccyn4STm',
      '0x563715a0773d8Bc54F0014D19BfB586f353a80f6',
      'TQrY8tryqsYVCYS3MFbtffiPp2ccyn4STm',
      'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    ]) {
      expect(getTransactionInputWarning(value), value).toMatch(/адрес кошелька/)
    }
  })

  it('reports how many characters a truncated hash has', () => {
    expect(getTransactionInputWarning(hash.slice(0, 63))).toBe('Хеш транзакции неполный: 63 из 64 символов. Скопируйте ссылку или хеш целиком.')
    expect(getTransactionInputWarning(`https://etherscan.io/tx/0x${hash.slice(0, 20)}`)).toMatch(/неполный: 20 из 64/)
  })

  it('flags random text and short numbers', () => {
    expect(getTransactionInputWarning('12345')).toMatch(/Не похоже на ссылку или хеш/)
    expect(getTransactionInputWarning('оплата за вчера')).toMatch(/Не похоже на ссылку или хеш/)
  })
})
