import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchDepositTransfers } from './depositTransferSearch'

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
const ourBscWallet = '0x7fa4e95b52813d5eefd860d22bf8f19467bc9adc'
const usdtBep20 = '0x55d398326f99059ff775485246999027b3197955'
const bscOperation = (timestamp: number, hash: string, value: string, from: string) => ({
  timestamp, transactionHash: hash, type: 'transfer', value, from, to: ourBscWallet,
  tokenInfo: { address: usdtBep20, decimals: '18', symbol: 'USDT' },
})
// Real Binplorer rows of the owner's example (2026-10-15): the 25 USDT deposit, a dust transfer
// from a look-alike address and an earlier 500 USDT deposit.
const exampleRows = [
  bscOperation(1792073576, '0x8e4018d7c519d88c88152c2716d302e75103ea84cc7666ad774fda534b22cbb6', '25000000000000000000', '0xa180fe01b906a1be37be6c534a3300785b20d947'),
  bscOperation(1792032017, '0xf679b1ed9c9b9c3362f9c009d9e3c0432e9cf3f87a800c8eaf75e6addb235c18', '20000000000000', '0xef3a4b4756fa626c88f01bc035837ff05af33b20'),
  bscOperation(1792031226, '0x1a151be1a49bbd9e19caf459df38b935716fd9c2d913adf15a00c8f5f57d2338', '500000000000000000000', '0xef3aeff9a5f61c6dda33069c58c1434006e13b20'),
]
const olderRows = (count: number, from: number) => Array.from({ length: count }, (_, index) =>
  bscOperation(from - index * 3600, `0xold${index}`, '25000000000000000000', '0xa180fe01b906a1be37be6c534a3300785b20d947'))
const now = Date.parse('2026-10-15T18:34:00Z')
let keysDir = ''

const withEtherscanKey = () => {
  keysDir = mkdtempSync(path.join(tmpdir(), 'transactioner-deposit-api-keys-'))
  writeFileSync(path.join(keysDir, 'api-keys.env'), 'ETHERSCAN_API_KEY=test-key\n')
  process.env.TRANSACTIONER_API_KEYS_PATH = path.join(keysDir, 'api-keys.env')
}

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.TRANSACTIONER_API_KEYS_PATH
  if (keysDir) rmSync(keysDir, { recursive: true, force: true })
  keysDir = ''
})

describe('deposit transfer search', () => {
  it('finds the owner\'s example by wallet, amount and message time and skips the dust transfer', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ operations: [...exampleRows, ...olderRows(97, 1792020000)] }))
    const result = await searchDepositTransfers({
      currency: 'USDT', network: 'BEP20', wallet: ourBscWallet, amount: '25', messageTime: '2026-10-15T16:12:00.000Z',
    }, now)
    expect(String(fetchMock.mock.calls[0][0])).toContain(`getAddressHistory/${ourBscWallet}`)
    expect(result.status).toBe('found')
    expect(result.candidates.map((item) => [item.hash.slice(0, 10), item.amount, new Date(item.timestampMs).toISOString()])).toEqual([
      ['0x8e4018d7', '25', '2026-10-15T14:12:56.000Z'],
    ])
    expect(result.candidates[0].explorerUrl).toBe('https://bscscan.com/tx/0x8e4018d7c519d88c88152c2716d302e75103ea84cc7666ad774fda534b22cbb6')
  })

  it('without the message time looks only at the last 2 hours', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ operations: exampleRows }))
    const result = await searchDepositTransfers({ currency: 'USDT', network: 'BEP20', wallet: ourBscWallet, amount: '25' }, now)
    expect(result).toMatchObject({ success: true, status: 'not_found', candidates: [] })
    expect(result.window).toEqual({ startMs: now - 2 * 60 * 60 * 1000, endMs: now })
  })

  it('does not claim "not found" when Binplorer returned 100 transfers all newer than the window start', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ operations: olderRows(100, Math.floor(now / 1000)).map((row, index) => ({ ...row, timestamp: Math.floor(now / 1000) - index * 10 })) }))
    const result = await searchDepositTransfers({ currency: 'USDT', network: 'BEP20', wallet: ourBscWallet, amount: '30' }, now)
    expect(result.status).toBe('error')
    expect(result.error).toContain('сузьте период')
  })

  it('lists every TRC20 transfer of the amount in the window, newest first', async () => {
    const wallet = 'TTyKPaFXB3XkkoaGJiksNbh7xE2JbbiBnf'
    const row = (hash: string, seconds: number, amount: string) => ({
      transaction_id: hash, from_address: 'TSender', to_address: wallet, quant: amount, block_ts: seconds * 1000,
      confirmed: true, finalResult: 'SUCCESS', tokenInfo: { tokenDecimal: 6 },
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      data: [row('older', now / 1000 - 3000, '50000000'), row('newer', now / 1000 - 600, '50000000'), row('other', now / 1000 - 700, '49000000')],
    }))
    const result = await searchDepositTransfers({ currency: 'USDT', network: 'TRC20', wallet, amount: '50' }, now)
    expect(String(fetchMock.mock.calls[0][0])).toContain('start_timestamp=')
    expect(result.candidates.map((item) => item.hash)).toEqual(['newer', 'older'])
  })

  it('finds native ETH deposits and skips failed transactions', async () => {
    withEtherscanKey()
    const wallet = '0x3ca9feab5bc29852f16b3a30ca4deb5117979fb7'
    const tx = (hash: string, isError: string) => ({ hash, from: '0xsender', to: wallet, value: '150000000000000000', timeStamp: String(now / 1000 - 900), isError })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ status: '1', message: 'OK', result: [tx('0xgood', '0'), tx('0xfailed', '1')] }))
    const result = await searchDepositTransfers({ currency: 'ETH', network: 'ETH', wallet, amount: '0.15' }, now)
    expect(String(fetchMock.mock.calls[0][0])).toContain('action=txlist')
    expect(result.candidates.map((item) => [item.hash, item.amount])).toEqual([['0xgood', '0.15']])
  })

  it('adds up BTC outputs to our address and marks unconfirmed transfers', async () => {
    const wallet = 'bc1qourwallet'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([
      { txid: 'pending', status: { confirmed: false }, vin: [{ prevout: { scriptpubkey_address: 'bc1qplayer' } }], vout: [{ scriptpubkey_address: wallet, value: 150000 }] },
      { txid: 'split', status: { confirmed: true, block_time: now / 1000 - 1200 }, vin: [], vout: [{ scriptpubkey_address: wallet, value: 100000 }, { scriptpubkey_address: wallet, value: 50000 }, { scriptpubkey_address: 'bc1qchange', value: 7 }] },
    ]))
    const result = await searchDepositTransfers({ currency: 'BTC', network: 'BTC', wallet, amount: '0.0015' }, now)
    expect(result.candidates.map((item) => [item.hash, item.amount, item.confirmed])).toEqual([['pending', '0.0015', false], ['split', '0.0015', true]])
  })

  it('reports networks without a search and a missing Etherscan key as not configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in tests'))
    expect(await searchDepositTransfers({ currency: 'SKRILL', network: 'EUR', wallet: 'x@y.z', amount: '10' }, now)).toMatchObject({ status: 'not_configured' })
    // No keys anywhere: neither the packaged file nor ~/dev/api-keys.env of this machine.
    keysDir = mkdtempSync(path.join(tmpdir(), 'transactioner-deposit-no-keys-'))
    process.env.TRANSACTIONER_API_KEYS_PATH = path.join(keysDir, 'missing.env')
    const home = process.env.HOME
    process.env.HOME = keysDir
    try {
      expect(await searchDepositTransfers({ currency: 'USDT', network: 'ERC20', wallet: '0xabc', amount: '10' }, now)).toMatchObject({ status: 'not_configured' })
    } finally {
      process.env.HOME = home
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
