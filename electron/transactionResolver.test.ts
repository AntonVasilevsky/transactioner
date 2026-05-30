import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatTokenAmount, parseTransactionInput, resolveTransaction } from './transactionResolver'

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.TRANSACTIONER_API_KEYS_PATH
})

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

  it('converts Champion Poker Ethereum USDC deposits to euros using the known token contract fallback', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'transactioner-api-keys-'))
    const apiKeysPath = path.join(tempDir, 'api-keys.env')
    writeFileSync(apiKeysPath, 'ETHERSCAN_API_KEY=test-key\n')
    process.env.TRANSACTIONER_API_KEYS_PATH = apiKeysPath

    const txHash = `0x${'a'.repeat(64)}`
    const rawUsdcAmount = '12a05f200'.padStart(64, '0')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('frankfurter.dev')) {
        return jsonResponse({ date: '2026-05-30', rates: { EUR: 0.92 } })
      }

      const requestUrl = new URL(url)
      const action = requestUrl.searchParams.get('action')
      if (action === 'eth_getTransactionReceipt') {
        return jsonResponse({
          result: {
            logs: [
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                data: `0x${rawUsdcAmount}`,
                topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
              },
            ],
          },
        })
      }
      if (action === 'eth_getTransactionByHash') {
        return jsonResponse({ result: { value: '0x0' } })
      }
      if (action === 'eth_call' && requestUrl.searchParams.get('data') === '0x313ce567') {
        return jsonResponse({ result: '0x6' })
      }
      if (action === 'eth_call' && requestUrl.searchParams.get('data') === '0x95d89b41') {
        return jsonResponse({ result: '0x' })
      }

      return jsonResponse({ result: null })
    })

    try {
      const result = await resolveTransaction({
        txInput: `https://etherscan.io/tx/${txHash}`,
        roomName: 'Champion Poker',
        operationType: 'Deposit',
      })

      expect(result.success).toBe(true)
      expect(result.currency).toBe('USDC')
      expect(result.displayAmount).toBe('$5000')
      expect(result.convertedDisplayAmount).toBe('€4600.00')
      expect(fetchMock).toHaveBeenCalled()
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('treats a lookup 404 as not found instead of a resolver error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }))

    const result = await resolveTransaction({
      txInput: `0x${'b'.repeat(64)}`,
      roomName: 'Champion Poker',
      operationType: 'Deposit',
    })

    expect(result.success).toBe(false)
    expect(result.status).toBe('not_found')
    expect(result.error).toBe('Транзакция не найдена в поддерживаемых сетях')
  })
})
