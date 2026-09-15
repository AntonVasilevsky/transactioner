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
})
