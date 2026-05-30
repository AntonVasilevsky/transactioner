import { describe, expect, it } from 'vitest'
import { formatTokenAmount, parseTransactionInput } from './transactionResolver'

describe('transaction resolver helpers', () => {
  it('extracts a Tron hash from a Tronscan URL', () => {
    expect(parseTransactionInput('https://tronscan.org/#/transaction/c1a4f1af4cfd2f99725b6219c850a37a1fd2e200415ed543acb0829ec69eb00d')).toEqual({
      hash: 'c1a4f1af4cfd2f99725b6219c850a37a1fd2e200415ed543acb0829ec69eb00d',
      preferredNetwork: 'tron',
    })
  })

  it('extracts an EVM hash and preferred network from a BscScan URL', () => {
    expect(parseTransactionInput('https://bscscan.com/tx/0x36a3c15e451784765c202e8fce9e11971ce945c3053c74432ca72638f4ce8c21')).toEqual({
      hash: '0x36a3c15e451784765c202e8fce9e11971ce945c3053c74432ca72638f4ce8c21',
      preferredNetwork: 'bsc',
    })
  })

  it('formats token amounts by decimals', () => {
    expect(formatTokenAmount('99990000000000000000', 18)).toBe('99.99')
    expect(formatTokenAmount('500000000', 6)).toBe('500')
    expect(formatTokenAmount('1234567890123456789', 18)).toBe('1.234567890123456789')
  })
})
