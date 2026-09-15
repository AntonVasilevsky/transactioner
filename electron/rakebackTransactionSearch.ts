import { loadApiKeys } from './transactionResolver'

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
const rawToAmount = (value: string, decimals: number) => Number(value) / (10 ** decimals)
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
  if (Array.isArray(data.result)) return data.result as Array<Record<string, unknown>>
  if (typeof data.result === 'string' && data.result.trim()) {
    throw new Error(`Explorer API: ${data.result}`)
  }
  if (data.status === '0' && data.message && data.message !== 'No transactions found') {
    throw new Error(`Explorer API: ${data.message}`)
  }
  return []
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

    if (config.chain === 'tron') {
      const url = new URL('https://apilist.tronscanapi.com/api/token_trc20/transfers-with-status')
      url.searchParams.set('limit', '50')
      url.searchParams.set('start', '0')
      url.searchParams.set('trc20Id', config.contract)
      url.searchParams.set('address', input.wallet.trim())
      url.searchParams.set('direction', '2')
      url.searchParams.set('reverse', 'true')
      url.searchParams.set('start_timestamp', String(startMs))
      url.searchParams.set('end_timestamp', String(endMs))
      const data = await fetchJson<{ token_transfers?: Array<Record<string, unknown>> }>(url.toString(), {
        headers: keys.TRONSCAN_API_KEY ? { 'TRON-PRO-API-KEY': keys.TRONSCAN_API_KEY } : undefined,
      })
      const candidates = (data.token_transfers || [])
        .filter(item => normalizeAddress(String(item.to_address || '')) === targetWallet)
        .filter(item => affiliateWallets.has(normalizeAddress(String(item.from_address || ''))))
        .filter(item => item.confirmed !== false && String(item.finalResult || 'SUCCESS') === 'SUCCESS')
        .map((item) => {
          const decimals = Number((item.tokenInfo as { tokenDecimal?: number } | undefined)?.tokenDecimal ?? 6)
          const actualAmount = rawToAmount(String(item.quant || '0'), decimals)
          const hash = String(item.transaction_id || '')
          return {
            hash,
            amount: String(actualAmount),
            from: String(item.from_address || ''),
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

    if (!keys.ETHERSCAN_API_KEY) {
      return { success: false, status: 'not_configured', error: 'Не найден ETHERSCAN_API_KEY в общих ключах приложения.' }
    }

    const url = new URL('https://api.etherscan.io/v2/api')
    url.searchParams.set('chainid', config.chainId || '1')
    url.searchParams.set('module', 'account')
    url.searchParams.set('action', 'tokentx')
    url.searchParams.set('contractaddress', config.contract)
    url.searchParams.set('address', input.wallet.trim())
    url.searchParams.set('page', '1')
    url.searchParams.set('offset', '100')
    url.searchParams.set('sort', 'desc')
    url.searchParams.set('apikey', keys.ETHERSCAN_API_KEY)
    const data = await fetchJson<{ status?: string, message?: string, result?: unknown }>(url.toString())
    const rows = extractEvmRows(data)
    const candidates = rows
      .filter(item => normalizeAddress(String(item.to || '')) === targetWallet)
      .filter(item => affiliateWallets.has(normalizeAddress(String(item.from || ''))))
      .filter((item) => {
        const ts = Number(item.timeStamp) * 1000
        return ts >= startMs && ts <= endMs
      })
      .map((item) => {
        const decimals = Number(item.tokenDecimal || 18)
        const actualAmount = rawToAmount(String(item.value || '0'), decimals)
        const hash = String(item.hash || '')
        return {
          hash,
          amount: String(actualAmount),
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
