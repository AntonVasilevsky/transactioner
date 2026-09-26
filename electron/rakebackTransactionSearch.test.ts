import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchRakebackTransaction } from './rakebackTransactionSearch'

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

const withApiKeys = () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'transactioner-rakeback-api-keys-'))
  const apiKeysPath = path.join(tempDir, 'api-keys.env')
  writeFileSync(apiKeysPath, 'ETHERSCAN_API_KEY=test-key\n')
  process.env.TRANSACTIONER_API_KEYS_PATH = apiKeysPath
  return tempDir
}

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.TRANSACTIONER_API_KEYS_PATH
})

describe('rakeback transaction search', () => {
  it('finds TRC20 payouts in the current TronScan response format', async () => {
    const playerWallet = 'TFahrxTTVust6Gxp5Q73raWiZxRdwrUVKN'
    const affiliateWallet = 'TH9pR7y4opKeR78jmutCgY4toDVfpFJjgM'
    const hash = '496ee58de1f8c6a107c9700d2de221d5be4241bdcad9336f5ae1002f4d3b015a'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      code: 200,
      page_size: 2,
      tokenInfo: { tokenDecimal: 6 },
      data: [
        {
          from: affiliateWallet,
          to: playerWallet,
          amount: '7000000',
          decimals: 6,
          hash,
          block_timestamp: Date.UTC(2026, 5, 23, 16, 5),
          confirmed: 1,
          final_result: 'SUCCESS',
        },
        {
          from: 'TUpHuDkiCCmwaTZBHZvQdwWzGNm5t8J2b9',
          to: playerWallet,
          amount: '10000000',
          decimals: 6,
          hash: '71533937fc1e4ed19a9862a0fb284afe0054b7f0ddac29b5170b9bd3a9f2f9e9',
          block_timestamp: Date.UTC(2026, 2, 6, 17, 8),
          confirmed: 1,
          final_result: 'SUCCESS',
        },
      ],
    }))

    const result = await searchRakebackTransaction({
      amount: '',
      network: 'USDT TRC20',
      wallet: playerWallet,
      periodFrom: '2025-08-01',
      periodTo: '2026-09-24',
      affiliateWallets: `USDT TRC20\n${affiliateWallet}`,
    })

    expect(result.status).toBe('found')
    expect(result.candidates).toEqual([{
      hash,
      amount: '7',
      from: affiliateWallet,
      date: '23.06.2026',
      explorerUrl: `https://tronscan.org/#/transaction/${hash}`,
      actualAmount: 7,
    }])
  })

  it('keeps reading the legacy TronScan transfer field names', async () => {
    const wallet = 'TFahrxTTVust6Gxp5Q73raWiZxRdwrUVKN'
    const affiliate = 'TH9pR7y4opKeR78jmutCgY4toDVfpFJjgM'
    const hash = '496ee58de1f8c6a107c9700d2de221d5be4241bdcad9336f5ae1002f4d3b015a'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      token_transfers: [{
        transaction_id: hash, from_address: affiliate, to_address: wallet,
        quant: '7000000', tokenInfo: { tokenDecimal: 6 },
        block_ts: Date.UTC(2026, 8, 10), confirmed: true, finalResult: 'SUCCESS',
      }],
    }))
    const result = await searchRakebackTransaction({
      amount: '', network: 'USDT TRC20', wallet,
      periodFrom: '2026-09-01', periodTo: '2026-09-30',
      affiliateWallets: affiliate,
    })
    expect(result.status).toBe('found')
    expect(result.candidates?.[0]).toMatchObject({ hash, amount: '7' })
  })

  it('finds EVM payouts without requiring amount', async () => {
    const tempDir = withApiKeys()
    const playerWallet = '0x050ddc980ce87f3df35bdfa6b21635b3b5298883'
    const affiliateWallet = '0x70af4652641f9c7d9ad18168894e87f8bad997b6'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      status: '1',
      message: 'OK',
      result: [
        {
          hash: `0x${'a'.repeat(64)}`,
          from: affiliateWallet,
          to: playerWallet,
          value: '401000000',
          tokenDecimal: '6',
          timeStamp: String(Date.UTC(2026, 7, 10) / 1000),
        },
        {
          hash: `0x${'b'.repeat(64)}`,
          from: affiliateWallet,
          to: playerWallet,
          value: '100000000',
          tokenDecimal: '6',
          timeStamp: String(Date.UTC(2026, 7, 11) / 1000),
        },
      ],
    }))

    try {
      const result = await searchRakebackTransaction({
        amount: '',
        network: 'USDC ERC20',
        wallet: playerWallet,
        periodFrom: '2026-08-01',
        periodTo: '2026-08-31',
        affiliateWallets: `USDC ERC20\n${affiliateWallet}`,
      })

      expect(result.success).toBe(true)
      expect(result.candidates).toHaveLength(2)
      expect(result.candidates?.[0].amount).toBe('401')
      expect(result.candidates?.[0].date).toBe('10.08.2026')
      expect(result.candidates?.[1].amount).toBe('100')
      expect(result.candidates?.[1].date).toBe('11.08.2026')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('uses amount only to sort, not to filter out other matching payouts', async () => {
    const tempDir = withApiKeys()
    const playerWallet = '0x050ddc980ce87f3df35bdfa6b21635b3b5298883'
    const affiliateWallet = '0x70af4652641f9c7d9ad18168894e87f8bad997b6'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      status: '1',
      message: 'OK',
      result: [
        {
          hash: `0x${'a'.repeat(64)}`,
          from: affiliateWallet,
          to: playerWallet,
          value: '100000000',
          tokenDecimal: '6',
          timeStamp: String(Date.UTC(2026, 7, 10) / 1000),
        },
        {
          hash: `0x${'b'.repeat(64)}`,
          from: affiliateWallet,
          to: playerWallet,
          value: '399990000',
          tokenDecimal: '6',
          timeStamp: String(Date.UTC(2026, 7, 11) / 1000),
        },
      ],
    }))

    try {
      const result = await searchRakebackTransaction({
        amount: '400',
        network: 'USDT ERC20',
        wallet: playerWallet,
        periodFrom: '2026-08-01',
        periodTo: '2026-08-31',
        affiliateWallets: affiliateWallet,
      })

      expect(result.success).toBe(true)
      expect(result.candidates).toHaveLength(2)
      expect(result.candidates?.[0].amount).toBe('399.99')
      expect(result.candidates?.[0].date).toBe('11.08.2026')
      expect(result.candidates?.[1].amount).toBe('100')
      expect(result.candidates?.[1].date).toBe('10.08.2026')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('reports explorer API errors instead of pretending that no transaction exists', async () => {
    const tempDir = withApiKeys()

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      status: '0',
      message: 'NOTOK',
      result: 'Max rate limit reached',
    }))

    try {
      const result = await searchRakebackTransaction({
        amount: '',
        network: 'USDT ERC20',
        wallet: '0x050ddc980ce87f3df35bdfa6b21635b3b5298883',
        periodFrom: '2026-08-01',
        periodTo: '2026-08-31',
        affiliateWallets: '0x70af4652641f9c7d9ad18168894e87f8bad997b6',
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('error')
      expect(result.error).toContain('Max rate limit reached')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('finds BEP20 payouts through Binplorer without a paid Etherscan chain plan', async () => {
    const wallet = '0x050ddc980ce87f3df35bdfa6b21635b3b5298883'
    const affiliate = '0x70af4652641f9c7d9ad18168894e87f8bad997b6'
    const hash = `0x${'e'.repeat(64)}`
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      operations: [{
        transactionHash: hash,
        timestamp: Date.UTC(2026, 8, 12) / 1000,
        from: affiliate,
        to: wallet,
        value: '12500000000000000000',
        type: 'transfer',
        tokenInfo: { address: '0x55d398326f99059ff775485246999027b3197955', decimals: '18' },
      }],
    }))

    const result = await searchRakebackTransaction({
      amount: '', network: 'USDT BEP20', wallet,
      periodFrom: '2026-09-01', periodTo: '2026-09-30',
      affiliateWallets: affiliate,
    })

    expect(result.status).toBe('found')
    expect(result.candidates?.[0]).toMatchObject({ hash, amount: '12.5', from: affiliate })
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.binplorer.com/getAddressHistory/')
  })

  it('reports malformed EVM responses as errors and accepts documented empty results', async () => {
    const tempDir = withApiKeys()
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const input = {
      amount: '', network: 'USDT ERC20',
      wallet: '0x050ddc980ce87f3df35bdfa6b21635b3b5298883',
      periodFrom: '2026-08-01', periodTo: '2026-08-31',
      affiliateWallets: '0x70af4652641f9c7d9ad18168894e87f8bad997b6',
    }

    try {
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: '0', message: 'No transactions found', result: 'No transactions found' }))
      expect((await searchRakebackTransaction(input)).status).toBe('not_found')
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: '1', message: 'OK', result: null }))
      expect((await searchRakebackTransaction(input)).status).toBe('error')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('checks the next Etherscan page instead of stopping after 100 transfers', async () => {
    const tempDir = withApiKeys()
    const wallet = '0x050ddc980ce87f3df35bdfa6b21635b3b5298883'
    const affiliate = '0x70af4652641f9c7d9ad18168894e87f8bad997b6'
    const unrelated = { hash: `0x${'1'.repeat(64)}`, from: '0x1111111111111111111111111111111111111111', to: wallet, value: '1000000', tokenDecimal: '6', timeStamp: String(Date.UTC(2026, 8, 10) / 1000) }
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ status: '1', message: 'OK', result: Array.from({ length: 100 }, () => unrelated) }))
      .mockResolvedValueOnce(jsonResponse({ status: '1', message: 'OK', result: [{ ...unrelated, hash: `0x${'2'.repeat(64)}`, from: affiliate }] }))
    try {
      const result = await searchRakebackTransaction({
        amount: '', network: 'USDT ERC20', wallet,
        periodFrom: '2026-09-01', periodTo: '2026-09-30',
        affiliateWallets: affiliate,
      })
      expect(result.status).toBe('found')
      expect(result.candidates).toHaveLength(1)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('page')).toBe('2')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('does not treat a Binplorer error envelope as no payouts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: { code: 136, message: 'Method disabled for this API key' } }))
    const result = await searchRakebackTransaction({
      amount: '', network: 'USDT BEP20',
      wallet: '0x050ddc980ce87f3df35bdfa6b21635b3b5298883',
      periodFrom: '2026-09-01', periodTo: '2026-09-30',
      affiliateWallets: '0x70af4652641f9c7d9ad18168894e87f8bad997b6',
    })
    expect(result.status).toBe('error')
    expect(result.error).toContain('Method disabled')
  })

  it('does not claim a complete BSC result outside the free explorer history window', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const result = await searchRakebackTransaction({
      amount: '', network: 'USDT BEP20',
      wallet: '0x050ddc980ce87f3df35bdfa6b21635b3b5298883',
      periodFrom: '2025-08-01', periodTo: '2026-09-24',
      affiliateWallets: '0x70af4652641f9c7d9ad18168894e87f8bad997b6',
    })
    expect(result.status).toBe('error')
    expect(result.error).toContain('30 дней')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
