import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatTokenAmount, parseTransactionInput, resolveTransaction } from './transactionResolver'

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const addressTopic = (address: string) => `0x${address.replace(/^0x/, '').padStart(64, '0')}`

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

  it('extracts a Bitcoin hash and preferred network from a Blockstream URL', () => {
    expect(parseTransactionInput('https://blockstream.info/tx/5f52529ab5d4ebb711a879ba30435062b58d0dcee4c82a98d479a398ca72145a')).toEqual({
      hash: '5f52529ab5d4ebb711a879ba30435062b58d0dcee4c82a98d479a398ca72145a',
      preferredNetwork: 'bitcoin',
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

  it('selects the Ethereum transfer sent to a saved room wallet in batch transactions', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'transactioner-api-keys-'))
    const apiKeysPath = path.join(tempDir, 'api-keys.env')
    writeFileSync(apiKeysPath, 'ETHERSCAN_API_KEY=test-key\n')
    process.env.TRANSACTIONER_API_KEYS_PATH = apiKeysPath

    const txHash = `0x${'c'.repeat(64)}`
    const nexaWallet = '0x3ca9feab5bc29852f16b3a30ca4deb5117979fb7'
    const otherWallet = '0x1111111111111111111111111111111111111111'
    const batchContract = '0xee7ae85f2fe2239e27d9c1e23fffe168d63b4055'
    const rawWrongAmount = BigInt(100000000).toString(16).padStart(64, '0')
    const rawNexaAmount = BigInt(59000000).toString(16).padStart(64, '0')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const requestUrl = new URL(String(input))
      const action = requestUrl.searchParams.get('action')
      if (action === 'eth_getTransactionReceipt') {
        return jsonResponse({
          result: {
            logs: [
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                data: `0x${rawWrongAmount}`,
                topics: [transferTopic, addressTopic(batchContract), addressTopic(otherWallet)],
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                data: `0x${rawNexaAmount}`,
                topics: [transferTopic, addressTopic(batchContract), addressTopic(nexaWallet)],
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

      return jsonResponse({ result: null })
    })

    try {
      const result = await resolveTransaction({
        txInput: `https://etherscan.io/tx/${txHash}`,
        roomName: 'Nexa',
        operationType: 'Deposit',
        knownWallets: [
          { address: otherWallet, roomName: 'Champion Poker', roomKey: 'champion-poker' },
          { address: nexaWallet, roomName: 'Nexa', roomKey: 'nexa' },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.currency).toBe('USDC')
      expect(result.displayAmount).toBe('$59')
      expect(fetchMock).toHaveBeenCalled()
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('does not fill an Ethereum amount when the matched wallet belongs to another room', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'transactioner-api-keys-'))
    const apiKeysPath = path.join(tempDir, 'api-keys.env')
    writeFileSync(apiKeysPath, 'ETHERSCAN_API_KEY=test-key\n')
    process.env.TRANSACTIONER_API_KEYS_PATH = apiKeysPath

    const txHash = `0x${'d'.repeat(64)}`
    const championWallet = '0x563715a0773d8bc54f0014d19bfb586f353a80f6'
    const rawAmount = BigInt(59000000).toString(16).padStart(64, '0')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const requestUrl = new URL(String(input))
      const action = requestUrl.searchParams.get('action')
      if (action === 'eth_getTransactionReceipt') {
        return jsonResponse({
          result: {
            logs: [
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                data: `0x${rawAmount}`,
                topics: [transferTopic, addressTopic('0xee7ae85f2fe2239e27d9c1e23fffe168d63b4055'), addressTopic(championWallet)],
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

      return jsonResponse({ result: null })
    })

    try {
      const result = await resolveTransaction({
        txInput: `https://etherscan.io/tx/${txHash}`,
        roomName: 'Nexa',
        operationType: 'Deposit',
        knownWallets: [
          { address: championWallet, roomName: 'Champion Poker', roomKey: 'champion-poker' },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.requiresManualAmount).toBe(true)
      expect(result.displayAmount).toBeUndefined()
      expect(result.warning).toContain('Champion Poker')
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

  it('resolves a plain Bitcoin transaction hash after Tron misses', async () => {
    const txHash = '5f52529ab5d4ebb711a879ba30435062b58d0dcee4c82a98d479a398ca72145a'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('tronscanapi.com')) {
        return new Response('not found', { status: 404 })
      }
      if (url === `https://blockstream.info/api/tx/${txHash}`) {
        return jsonResponse({ txid: txHash })
      }
      return new Response('not found', { status: 404 })
    })

    const result = await resolveTransaction({
      txInput: txHash,
      roomName: 'Champion Poker',
      operationType: 'Deposit',
    })

    expect(result.success).toBe(true)
    expect(result.network).toBe('bitcoin')
    expect(result.explorerUrl).toBe(`https://blockstream.info/tx/${txHash}`)
    expect(result.displayAmount).toBeUndefined()
    expect(fetchMock).toHaveBeenCalled()
  })

  it('fills a Bitcoin amount only when an output matches the selected room wallet', async () => {
    const txHash = '5f52529ab5d4ebb711a879ba30435062b58d0dcee4c82a98d479a398ca72145a'
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('tronscanapi.com')) {
        return new Response('not found', { status: 404 })
      }
      if (url === `https://blockstream.info/api/tx/${txHash}`) {
        return jsonResponse({
          txid: txHash,
          vout: [
            { scriptpubkey_address: 'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t', value: 2169403 },
            { scriptpubkey_address: 'bc1qrt637h6zvq5pulyycn8lrutm8s0k05x5px7csz', value: 15671398 },
          ],
        })
      }
      return new Response('not found', { status: 404 })
    })

    const result = await resolveTransaction({
      txInput: txHash,
      roomName: 'Champion Poker',
      operationType: 'Deposit',
      knownWallets: [
        { address: 'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t', roomName: 'Champion Poker', roomKey: 'champion-poker' },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.network).toBe('bitcoin')
    expect(result.displayAmount).toBe('0.02169403 BTC')
  })

  it('does not fill a Bitcoin amount when the output matches another room wallet', async () => {
    const txHash = '5f52529ab5d4ebb711a879ba30435062b58d0dcee4c82a98d479a398ca72145a'
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('tronscanapi.com')) {
        return new Response('not found', { status: 404 })
      }
      if (url === `https://blockstream.info/api/tx/${txHash}`) {
        return jsonResponse({
          txid: txHash,
          vout: [
            { scriptpubkey_address: 'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t', value: 2169403 },
          ],
        })
      }
      return new Response('not found', { status: 404 })
    })

    const result = await resolveTransaction({
      txInput: txHash,
      roomName: 'Nexa',
      operationType: 'Deposit',
      knownWallets: [
        { address: 'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t', roomName: 'Champion Poker', roomKey: 'champion-poker' },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.requiresManualAmount).toBe(true)
    expect(result.displayAmount).toBeUndefined()
    expect(result.warning).toContain('Champion Poker')
  })

  it('requires manual handling when a Bitcoin transaction has multiple outputs to selected room wallets', async () => {
    const txHash = '5f52529ab5d4ebb711a879ba30435062b58d0dcee4c82a98d479a398ca72145a'
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('tronscanapi.com')) {
        return new Response('not found', { status: 404 })
      }
      if (url === `https://blockstream.info/api/tx/${txHash}`) {
        return jsonResponse({
          txid: txHash,
          vout: [
            { scriptpubkey_address: 'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t', value: 2169403 },
            { scriptpubkey_address: 'bc1qrt637h6zvq5pulyycn8lrutm8s0k05x5px7csz', value: 15671398 },
          ],
        })
      }
      return new Response('not found', { status: 404 })
    })

    const result = await resolveTransaction({
      txInput: txHash,
      roomName: 'Champion Poker',
      operationType: 'Deposit',
      knownWallets: [
        { address: 'bc1qwsv0zew92jkaxetvn2tvp5jrz3pyl5u2phx57t', roomName: 'Champion Poker', roomKey: 'champion-poker' },
        { address: 'bc1qrt637h6zvq5pulyycn8lrutm8s0k05x5px7csz', roomName: 'Champion Poker', roomKey: 'champion-poker' },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.requiresManualAmount).toBe(true)
    expect(result.displayAmount).toBeUndefined()
    expect(result.warning).toContain('несколько переводов')
  })
})
