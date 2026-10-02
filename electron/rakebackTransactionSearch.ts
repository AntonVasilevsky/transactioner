import { formatTokenAmount, loadApiKeys } from './transactionResolver'
import { fetchEtherscanJson } from './etherscanClient'

export interface SearchRakebackTransactionInput {
  amount: string
  network: string
  wallet: string
  periodFrom: string
  periodTo: string
  affiliateWallets: string
}

export interface RakebackTransactionCandidate {
  hash: string
  amount: string
  from: string
  date: string
  explorerUrl: string
}

export interface SearchRakebackTransactionResult {
  success: boolean
  status: 'found' | 'not_found' | 'not_configured' | 'error'
  candidates?: RakebackTransactionCandidate[]
  error?: string
}

const normalizeAddress = (value: string) => value.trim().toLowerCase()
const normalizeNetwork = (value: string) => value.trim().toUpperCase()
const parseAmountValue = (value: string) => {
  const normalized = String(value || '').replace(',', '.').replace(/[^\d.]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
const startOfDateInput = (value: string) => new Date(`${value}T00:00:00.000`).getTime()
const endOfDateInput = (value: string) => new Date(`${value}T23:59:59.999`).getTime()
const timestampMilliseconds = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0
    ? (numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
    : Number.NaN
}
const amountDistance = (actual: number, expected: number | null) => (
  expected === null ? 0 : Math.abs(actual - expected)
)
const formatTransactionDate = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return ''
  const milliseconds = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getUTCFullYear()}`
}
const firstTransactionDate = (...values: unknown[]) => {
  for (const value of values) {
    const formatted = formatTransactionDate(value)
    if (formatted) return formatted
  }
  return ''
}

const parseAffiliateWallets = (value: string) => new Set(
  (String(value || '').match(/(?:0x[a-f0-9]{40}|T[1-9A-HJ-NP-Za-km-z]{33}|bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})/gi) || [])
    .map(normalizeAddress)
)

const tokenConfig = (network: string) => {
  const normalized = normalizeNetwork(network)
  if (normalized.includes('TRC20')) {
    if (normalized.includes('USDT')) return { chain: 'tron', contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', explorer: 'https://tronscan.org/#/transaction/' }
    if (normalized.includes('USDC')) return { chain: 'tron', contract: '', explorer: 'https://tronscan.org/#/transaction/' }
  }
  if (normalized.includes('ERC20')) {
    if (normalized.includes('USDT')) return { chain: 'ethereum', chainId: '1', contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', explorer: 'https://etherscan.io/tx/' }
    if (normalized.includes('USDC')) return { chain: 'ethereum', chainId: '1', contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', explorer: 'https://etherscan.io/tx/' }
  }
  if (normalized.includes('BEP20')) {
    if (normalized.includes('USDT')) return { chain: 'bsc', chainId: '56', contract: '0x55d398326f99059ff775485246999027b3197955', explorer: 'https://bscscan.com/tx/' }
    if (normalized.includes('USDC')) return { chain: 'bsc', chainId: '56', contract: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', explorer: 'https://bscscan.com/tx/' }
  }
  return null
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

export const searchRakebackTransaction = async (
  input: SearchRakebackTransactionInput
): Promise<SearchRakebackTransactionResult> => {
  try {
    const config = tokenConfig(input.network)
    if (!config?.contract) {
      return { success: false, status: 'not_configured', error: 'Для этой сети автоматический поиск пока не подключён. Можно вставить TX вручную.' }
    }

    const affiliateWallets = parseAffiliateWallets(input.affiliateWallets)
    if (!affiliateWallets.size) {
      return { success: false, status: 'not_configured', error: 'Добавьте кошелек, с которого отправляется рейкбек.' }
    }

    const keys = loadApiKeys()
    const expectedAmount = parseAmountValue(input.amount)
    const targetWallet = normalizeAddress(input.wallet)
    const startMs = startOfDateInput(input.periodFrom)
    const endMs = endOfDateInput(input.periodTo)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
      throw new Error('Некорректный период поиска')
    }

    if (config.chain === 'tron') {
      const allRows: Array<Record<string, unknown>> = []
      let defaultDecimals: number | string = 6
      const pageSize = 50
      for (let page = 0; page < 20; page++) {
        const url = new URL('https://apilist.tronscanapi.com/api/token_trc20/transfers-with-status')
        url.searchParams.set('limit', String(pageSize))
        url.searchParams.set('start', String(page * pageSize))
        url.searchParams.set('trc20Id', config.contract)
        url.searchParams.set('address', input.wallet.trim())
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
      const candidates = requireTransferFields(normalizedRows, ['hash', 'from', 'to', 'amount', 'block_timestamp'], 'TronScan')
        .filter(item => normalizeAddress(String(item.to)) === targetWallet)
        .filter(item => affiliateWallets.has(normalizeAddress(String(item.from))))
        .filter(item => item.confirmed !== false && item.confirmed !== 0 && item.confirmed !== '0')
        .filter(item => String(item.final_result || item.finalResult || 'SUCCESS').toUpperCase() === 'SUCCESS')
        .filter(item => {
          const timestamp = timestampMilliseconds(item.block_timestamp)
          return Number.isFinite(timestamp) && timestamp >= startMs && timestamp <= endMs
        })
        .map((item) => {
          const decimals = item.decimals ?? (item.tokenInfo as { tokenDecimal?: number | string } | undefined)?.tokenDecimal ?? defaultDecimals
          const amount = tokenAmount(item.amount, decimals, 'TronScan')
          const actualAmount = Number(amount)
          const hash = String(item.hash || item.transaction_id || '')
          return {
            hash,
            amount,
            from: String(item.from || item.from_address || ''),
            date: firstTransactionDate(item.block_ts, item.block_timestamp, item.blockTimestamp, item.timestamp, item.transaction_timestamp),
            explorerUrl: `${config.explorer}${hash}`,
            actualAmount,
          }
        })
        .sort((left, right) => amountDistance(left.actualAmount, expectedAmount) - amountDistance(right.actualAmount, expectedAmount))

      return candidates.length
        ? { success: true, status: 'found', candidates }
        : { success: false, status: 'not_found', candidates: [] }
    }

    if (config.chain === 'bsc') {
      if (startMs < Date.now() - 30 * 24 * 60 * 60 * 1000) {
        throw new Error('Бесплатный Binplorer показывает только последние 30 дней: более старый период нельзя проверить автоматически')
      }
      const url = new URL(`https://api.binplorer.com/getAddressHistory/${input.wallet.trim()}`)
      url.searchParams.set('apiKey', 'freekey')
      url.searchParams.set('limit', '100')
      url.searchParams.set('token', config.contract)
      const data = await fetchJson<{ error?: { message?: string } | string, operations?: unknown }>(url.toString())
      const allRows = extractBinplorerRows(data)
      if (allRows.length >= 100) throw new Error('Binplorer вернул только первые 100 переводов: сузьте период поиска')
      const rows = requireTransferFields(
        allRows.filter(item => item.type === 'transfer'),
        ['transactionHash', 'timestamp', 'from', 'to', 'value', 'tokenInfo'],
        'Binplorer'
      )
      const candidates = rows
        .filter(item => normalizeAddress(String((item.tokenInfo as { address?: string }).address || '')) === normalizeAddress(config.contract))
        .filter(item => normalizeAddress(String(item.to)) === targetWallet)
        .filter(item => affiliateWallets.has(normalizeAddress(String(item.from))))
        .filter(item => {
          const timestamp = timestampMilliseconds(item.timestamp)
          return timestamp >= startMs && timestamp <= endMs
        })
        .map(item => {
          const amount = tokenAmount(item.value, (item.tokenInfo as { decimals?: string | number }).decimals, 'Binplorer')
          const hash = String(item.transactionHash)
          return {
            hash, amount, from: String(item.from), date: formatTransactionDate(item.timestamp),
            explorerUrl: `${config.explorer}${hash}`, actualAmount: Number(amount),
          }
        })
        .sort((left, right) => amountDistance(left.actualAmount, expectedAmount) - amountDistance(right.actualAmount))
      return candidates.length
        ? { success: true, status: 'found', candidates }
        : { success: false, status: 'not_found', candidates: [] }
    }

    if (!keys.ETHERSCAN_API_KEY) {
      return { success: false, status: 'not_configured', error: 'Не найден ETHERSCAN_API_KEY в общих ключах приложения.' }
    }

    const rows: Array<Record<string, unknown>> = []
    const pageSize = 100
    for (let page = 1; page <= 20; page++) {
      const url = new URL('https://api.etherscan.io/v2/api')
      url.searchParams.set('chainid', config.chainId || '1')
      url.searchParams.set('module', 'account')
      url.searchParams.set('action', 'tokentx')
      url.searchParams.set('contractaddress', config.contract)
      url.searchParams.set('address', input.wallet.trim())
      url.searchParams.set('page', String(page))
      url.searchParams.set('offset', String(pageSize))
      url.searchParams.set('sort', 'desc')
      url.searchParams.set('apikey', keys.ETHERSCAN_API_KEY)
      const data = await fetchEtherscanJson<{ status?: string, message?: string, result?: unknown }>(url.toString())
      const pageRows = extractEvmRows(data)
      rows.push(...pageRows)
      if (pageRows.length < pageSize) break
      if (page === 20) throw new Error('Etherscan вернул слишком много переводов: сузьте период поиска')
    }
    const candidates = requireTransferFields(rows, ['hash', 'from', 'to', 'value', 'tokenDecimal', 'timeStamp'], 'Etherscan')
      .filter(item => normalizeAddress(String(item.to || '')) === targetWallet)
      .filter(item => affiliateWallets.has(normalizeAddress(String(item.from || ''))))
      .filter((item) => {
        const ts = timestampMilliseconds(item.timeStamp)
        return ts >= startMs && ts <= endMs
      })
      .map((item) => {
        const amount = tokenAmount(item.value, item.tokenDecimal, 'Etherscan')
        const actualAmount = Number(amount)
        const hash = String(item.hash || '')
        return {
          hash,
          amount,
          from: String(item.from || ''),
          date: formatTransactionDate(item.timeStamp),
          explorerUrl: `${config.explorer}${hash}`,
          actualAmount,
        }
      })
      .sort((left, right) => amountDistance(left.actualAmount, expectedAmount) - amountDistance(right.actualAmount, expectedAmount))

    return candidates.length
      ? { success: true, status: 'found', candidates }
      : { success: false, status: 'not_found', candidates: [] }
  } catch (err) {
    return { success: false, status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}
