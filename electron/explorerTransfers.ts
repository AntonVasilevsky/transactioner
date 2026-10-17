import { formatTokenAmount, loadApiKeys } from './transactionResolver'
import { fetchEtherscanJson } from './etherscanClient'
import type { TransferSource } from '../src/utils/explorerNetworks'

/**
 * Incoming transfers to one wallet in a time window, from the block explorers the app already
 * uses (T-0027): TronScan, Binplorer (BSC), Etherscan v2, Blockstream. Shared by the rakeback
 * search (payouts to the player's wallet) and the deposit search (deposits to our wallet).
 */
export interface IncomingTransfer {
  hash: string
  from: string
  to: string
  amount: string
  timestampMs: number
  explorerUrl: string
  confirmed: boolean
}

/** A key the search needs is missing; callers show it as "not configured", not as an error. */
export class ExplorerNotConfiguredError extends Error {}

export const normalizeAddress = (value: string) => value.trim().toLowerCase()

export const timestampMilliseconds = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0
    ? (numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
    : Number.NaN
}

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.text()
  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error(`Explorer API вернул не JSON: ${body.slice(0, 80) || `HTTP ${response.status}`}`)
  }
}

const extractEvmRows = (data: { status?: string, message?: string, result?: unknown }) => {
  if (
    data?.status === '0' && data.message === 'No transactions found' &&
    (Array.isArray(data.result) && data.result.length === 0 || data.result === 'No transactions found')
  ) return []
  if (data?.status !== '1' || !Array.isArray(data.result)) {
    const detail = typeof data?.result === 'string' && data.result.trim()
      ? data.result : data?.message || 'неожиданный формат ответа'
    throw new Error(`Etherscan API: ${detail}`)
  }
  return data.result as Array<Record<string, unknown>>
}

const extractTronRows = (response: {
  code?: number
  message?: string
  data?: unknown
  token_transfers?: unknown
}) => {
  if (!response || typeof response !== 'object') throw new Error('TronScan API вернул неожиданный формат переводов')
  if (response.code !== undefined && response.code !== 200) {
    throw new Error(`TronScan API: ${response.message || `code ${response.code}`}`)
  }
  if ('error' in response && response.error) throw new Error(`TronScan API: ${String(response.error)}`)
  const rows = response.data ?? response.token_transfers
  if (!Array.isArray(rows)) throw new Error('TronScan API вернул неожиданный формат переводов')
  return rows as Array<Record<string, unknown>>
}

const extractBinplorerRows = (response: {
  error?: { message?: string } | string
  operations?: unknown
}) => {
  if (response?.error) {
    const message = typeof response.error === 'string' ? response.error : response.error.message
    throw new Error(`Binplorer API: ${message || 'ошибка провайдера'}`)
  }
  if (!Array.isArray(response?.operations)) throw new Error('Binplorer API вернул неожиданный формат переводов')
  return response.operations as Array<Record<string, unknown>>
}

const requireTransferFields = (rows: Array<Record<string, unknown>>, fields: string[], provider: string) => {
  if (rows.some(row => !row || typeof row !== 'object' || fields.some(field => row[field] === undefined || row[field] === null || row[field] === ''))) {
    throw new Error(`${provider} API вернул неполные данные перевода`)
  }
  return rows
}

const tokenAmount = (raw: unknown, decimalsValue: unknown, provider: string) => {
  const decimals = Number(decimalsValue)
  if (!/^\d+$/.test(String(raw)) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`${provider} API вернул некорректную сумму или точность токена`)
  }
  return formatTokenAmount(String(raw), decimals)
}

const inWindow = (timestampMs: number, startMs: number, endMs: number) =>
  Number.isFinite(timestampMs) && timestampMs >= startMs && timestampMs <= endMs

const fetchTronTokenTransfers = async (contract: string, wallet: string, startMs: number, endMs: number, explorer: string) => {
  const keys = loadApiKeys()
  const allRows: Array<Record<string, unknown>> = []
  let defaultDecimals: number | string = 6
  const pageSize = 50
  for (let page = 0; page < 20; page++) {
    const url = new URL('https://apilist.tronscanapi.com/api/token_trc20/transfers-with-status')
    url.searchParams.set('limit', String(pageSize))
    url.searchParams.set('start', String(page * pageSize))
    url.searchParams.set('trc20Id', contract)
    url.searchParams.set('address', wallet)
    url.searchParams.set('direction', '2')
    url.searchParams.set('reverse', 'true')
    url.searchParams.set('start_timestamp', String(startMs))
    url.searchParams.set('end_timestamp', String(endMs))
    const data = await fetchJson<{
      code?: number
      message?: string
      data?: unknown
      token_transfers?: unknown
      tokenInfo?: { tokenDecimal?: number | string }
    }>(url.toString(), {
      headers: keys.TRONSCAN_API_KEY ? { 'TRON-PRO-API-KEY': keys.TRONSCAN_API_KEY } : undefined,
    })
    const rows = extractTronRows(data)
    defaultDecimals = data.tokenInfo?.tokenDecimal ?? defaultDecimals
    allRows.push(...rows)
    if (rows.length < pageSize) break
    if (page === 19) throw new Error('TronScan вернул слишком много переводов: сузьте период поиска')
  }
  const normalizedRows = allRows.map(item => ({
    ...item,
    hash: item.hash ?? item.transaction_id,
    from: item.from ?? item.from_address,
    to: item.to ?? item.to_address,
    amount: item.amount ?? item.quant,
    block_timestamp: item.block_timestamp ?? item.block_ts ?? item.blockTimestamp ?? item.timestamp ?? item.transaction_timestamp,
  }))
  return requireTransferFields(normalizedRows, ['hash', 'from', 'to', 'amount', 'block_timestamp'], 'TronScan')
    .filter(item => normalizeAddress(String(item.to)) === normalizeAddress(wallet))
    .filter(item => item.confirmed !== false && item.confirmed !== 0 && item.confirmed !== '0')
    .filter(item => String(item.final_result || item.finalResult || 'SUCCESS').toUpperCase() === 'SUCCESS')
    .map((item): IncomingTransfer => {
      const decimals = item.decimals ?? (item.tokenInfo as { tokenDecimal?: number | string } | undefined)?.tokenDecimal ?? defaultDecimals
      const hash = String(item.hash)
      return {
        hash,
        from: String(item.from),
        to: String(item.to),
        amount: tokenAmount(item.amount, decimals, 'TronScan'),
        timestampMs: timestampMilliseconds(item.block_timestamp),
        explorerUrl: `${explorer}${hash}`,
        confirmed: true,
      }
    })
    .filter(item => inWindow(item.timestampMs, startMs, endMs))
}

/** Free Binplorer returns the latest 100 operations of the last 30 days. */
const fetchBscTokenTransfers = async (contract: string, wallet: string, startMs: number, endMs: number, explorer: string, nowMs: number) => {
  if (startMs < nowMs - 30 * 24 * 60 * 60 * 1000) {
    throw new Error('Бесплатный Binplorer показывает только последние 30 дней: более старый период нельзя проверить автоматически')
  }
  const limit = 100
  const url = new URL(`https://api.binplorer.com/getAddressHistory/${wallet}`)
  url.searchParams.set('apiKey', 'freekey')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('token', contract)
  const data = await fetchJson<{ error?: { message?: string } | string, operations?: unknown }>(url.toString())
  const allRows = extractBinplorerRows(data)
  const oldestMs = Math.min(...allRows.map(item => timestampMilliseconds(item.timestamp)).filter(Number.isFinite))
  if (allRows.length >= limit && !(oldestMs < startMs)) {
    throw new Error('Binplorer вернул только последние 100 переводов, и все они новее начала периода: сузьте период поиска')
  }
  const rows = requireTransferFields(
    allRows.filter(item => item.type === 'transfer'),
    ['transactionHash', 'timestamp', 'from', 'to', 'value', 'tokenInfo'],
    'Binplorer'
  )
  return rows
    .filter(item => normalizeAddress(String((item.tokenInfo as { address?: string }).address || '')) === normalizeAddress(contract))
    .filter(item => normalizeAddress(String(item.to)) === normalizeAddress(wallet))
    .map((item): IncomingTransfer => {
      const hash = String(item.transactionHash)
      return {
        hash,
        from: String(item.from),
        to: String(item.to),
        amount: tokenAmount(item.value, (item.tokenInfo as { decimals?: string | number }).decimals, 'Binplorer'),
        timestampMs: timestampMilliseconds(item.timestamp),
        explorerUrl: `${explorer}${hash}`,
        confirmed: true,
      }
    })
    .filter(item => inWindow(item.timestampMs, startMs, endMs))
}

/** Etherscan pages newest first; reading stops at the first page that reaches before the window. */
const fetchEtherscanRows = async (chainId: string, action: 'tokentx' | 'txlist', wallet: string, startMs: number, contract?: string) => {
  const keys = loadApiKeys()
  if (!keys.ETHERSCAN_API_KEY) throw new ExplorerNotConfiguredError('Не найден ETHERSCAN_API_KEY в общих ключах приложения.')
  const rows: Array<Record<string, unknown>> = []
  const pageSize = 100
  for (let page = 1; page <= 20; page++) {
    const url = new URL('https://api.etherscan.io/v2/api')
    url.searchParams.set('chainid', chainId)
    url.searchParams.set('module', 'account')
    url.searchParams.set('action', action)
    if (contract) url.searchParams.set('contractaddress', contract)
    url.searchParams.set('address', wallet)
    url.searchParams.set('page', String(page))
    url.searchParams.set('offset', String(pageSize))
    url.searchParams.set('sort', 'desc')
    url.searchParams.set('apikey', keys.ETHERSCAN_API_KEY)
    const data = await fetchEtherscanJson<{ status?: string, message?: string, result?: unknown }>(url.toString())
    const pageRows = extractEvmRows(data)
    rows.push(...pageRows)
    if (pageRows.length < pageSize) break
    const oldest = timestampMilliseconds(pageRows[pageRows.length - 1]?.timeStamp)
    if (oldest < startMs) break
    if (page === 20) throw new Error('Etherscan вернул слишком много переводов: сузьте период поиска')
  }
  return rows
}

const fetchEvmTokenTransfers = async (chainId: string, contract: string, wallet: string, startMs: number, endMs: number, explorer: string) =>
  requireTransferFields(await fetchEtherscanRows(chainId, 'tokentx', wallet, startMs, contract), ['hash', 'from', 'to', 'value', 'tokenDecimal', 'timeStamp'], 'Etherscan')
    .filter(item => normalizeAddress(String(item.to)) === normalizeAddress(wallet))
    .map((item): IncomingTransfer => {
      const hash = String(item.hash)
      return {
        hash,
        from: String(item.from),
        to: String(item.to),
        amount: tokenAmount(item.value, item.tokenDecimal, 'Etherscan'),
        timestampMs: timestampMilliseconds(item.timeStamp),
        explorerUrl: `${explorer}${hash}`,
        confirmed: true,
      }
    })
    .filter(item => inWindow(item.timestampMs, startMs, endMs))

const fetchEvmNativeTransfers = async (chainId: string, wallet: string, startMs: number, endMs: number, explorer: string) =>
  requireTransferFields(await fetchEtherscanRows(chainId, 'txlist', wallet, startMs), ['hash', 'from', 'to', 'value', 'timeStamp'], 'Etherscan')
    .filter(item => normalizeAddress(String(item.to)) === normalizeAddress(wallet))
    .filter(item => String(item.isError ?? '0') === '0')
    .map((item): IncomingTransfer => {
      const hash = String(item.hash)
      return {
        hash,
        from: String(item.from),
        to: String(item.to),
        amount: tokenAmount(item.value, 18, 'Etherscan'),
        timestampMs: timestampMilliseconds(item.timeStamp),
        explorerUrl: `${explorer}${hash}`,
        confirmed: true,
      }
    })
    .filter(item => inWindow(item.timestampMs, startMs, endMs))

interface BitcoinAddressTx {
  txid?: string
  status?: { confirmed?: boolean, block_time?: number }
  vin?: Array<{ prevout?: { scriptpubkey_address?: string } }>
  vout?: Array<{ scriptpubkey_address?: string, value?: number }>
}

/** Blockstream lists mempool and the newest 25 confirmed transactions, then older pages by last txid. */
const fetchBitcoinTransfers = async (wallet: string, startMs: number, endMs: number, explorer: string, nowMs: number) => {
  const address = wallet.trim()
  const transfers: IncomingTransfer[] = []
  let url = `https://blockstream.info/api/address/${address}/txs`
  for (let page = 0; page < 10; page++) {
    const txs = await fetchJson<BitcoinAddressTx[]>(url)
    if (!Array.isArray(txs)) throw new Error('Blockstream API вернул неожиданный формат транзакций')
    for (const tx of txs) {
      if (!tx?.txid || !Array.isArray(tx.vout)) throw new Error('Blockstream API вернул неполные данные транзакции')
      const received = tx.vout
        .filter(output => normalizeAddress(String(output.scriptpubkey_address || '')) === normalizeAddress(address))
        .reduce((sum, output) => sum + (Number(output.value) || 0), 0)
      if (received <= 0) continue
      const confirmed = Boolean(tx.status?.confirmed)
      transfers.push({
        hash: tx.txid,
        from: String(tx.vin?.[0]?.prevout?.scriptpubkey_address || ''),
        to: address,
        amount: formatTokenAmount(String(received), 8),
        timestampMs: confirmed ? timestampMilliseconds(tx.status?.block_time) : nowMs,
        explorerUrl: `${explorer}${tx.txid}`,
        confirmed,
      })
    }
    const confirmedTxs = txs.filter(tx => tx.status?.confirmed)
    const last = confirmedTxs[confirmedTxs.length - 1]
    if (!last || confirmedTxs.length < 25 || timestampMilliseconds(last.status?.block_time) < startMs) break
    url = `https://blockstream.info/api/address/${address}/txs/chain/${last.txid}`
  }
  return transfers.filter(item => inWindow(item.timestampMs, startMs, endMs))
}

export const fetchIncomingTransfers = async (
  source: TransferSource,
  wallet: string,
  startMs: number,
  endMs: number,
  nowMs = Date.now(),
): Promise<IncomingTransfer[]> => {
  const address = wallet.trim()
  if (source.kind === 'tron-token') return fetchTronTokenTransfers(source.contract, address, startMs, endMs, source.explorer)
  if (source.kind === 'bsc-token') return fetchBscTokenTransfers(source.contract, address, startMs, endMs, source.explorer, nowMs)
  if (source.kind === 'evm-token') return fetchEvmTokenTransfers(source.chainId, source.contract, address, startMs, endMs, source.explorer)
  if (source.kind === 'evm-native') return fetchEvmNativeTransfers(source.chainId, address, startMs, endMs, source.explorer)
  return fetchBitcoinTransfers(address, startMs, endMs, source.explorer, nowMs)
}
