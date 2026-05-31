import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { convertUsdToEur } from './currency'

export type TransactionNetwork = 'ethereum' | 'bsc' | 'tron' | 'bitcoin'

interface ResolveTransactionInput {
  txInput: string
  roomName?: string
  operationType?: string
}

interface ParsedTransactionInput {
  hash: string
  preferredNetwork?: TransactionNetwork
}

export interface ResolveTransactionResult {
  success: boolean
  status: 'resolved' | 'not_found' | 'invalid' | 'error'
  txHash?: string
  network?: TransactionNetwork
  explorerUrl?: string
  amount?: string
  currency?: string
  displayAmount?: string
  convertedAmount?: string
  convertedCurrency?: string
  convertedDisplayAmount?: string
  fxRate?: number
  fxDate?: string
  error?: string
}

interface ApiKeys {
  ETHERSCAN_API_KEY?: string
  TRONSCAN_API_KEY?: string
}

interface TronTransfer {
  amount_str?: string
  amount?: string | number
  decimals?: string | number
  symbol?: string
}

interface TronTransactionResponse {
  hash?: string
  tokenTransferInfo?: TronTransfer
  trc20TransferInfo?: TronTransfer[]
  transfersAllList?: TronTransfer[]
}

interface BinplorerOperation {
  type?: string
  value?: string
  tokenInfo?: {
    decimals?: string | number
    symbol?: string
  }
}

interface BinplorerTransactionResponse {
  hash?: string
  operations?: BinplorerOperation[]
}

interface EtherscanProxyResponse {
  result?: unknown
}

interface EthereumLog {
  address: string
  data: string
  topics?: string[]
}

interface EthereumReceipt {
  logs?: EthereumLog[]
}

interface EthereumTransaction {
  value?: string
}

interface BitcoinTransactionResponse {
  txid?: string
}

const cache = new Map<string, { expiresAt: number, result: ResolveTransactionResult }>()
const cacheTtlMs = 10 * 60 * 1000
const evmHashPattern = /^0x[a-fA-F0-9]{64}$/
const tronHashPattern = /^[a-fA-F0-9]{64}$/
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const explorers: Record<TransactionNetwork, (hash: string) => string> = {
  ethereum: hash => `https://etherscan.io/tx/${hash}`,
  bsc: hash => `https://bscscan.com/tx/${hash}`,
  tron: hash => `https://tronscan.org/#/transaction/${hash}`,
  bitcoin: hash => `https://blockstream.info/tx/${hash}`,
}

const knownTokenSymbols: Partial<Record<TransactionNetwork, Record<string, string>>> = {
  ethereum: {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  },
  bsc: {
    '0x55d398326f99059ff775485246999027b3197955': 'USDT',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'USDC',
  },
}

const amountFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 6,
  useGrouping: false,
})

export const parseTransactionInput = (input: string): ParsedTransactionInput | null => {
  const value = String(input || '').trim()
  if (!value) return null

  const hashMatch = value.match(/(?:0x)?[a-fA-F0-9]{64}/)
  const hash = hashMatch?.[0]
  if (!hash) return null

  let preferredNetwork: TransactionNetwork | undefined
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (host.includes('tronscan')) preferredNetwork = 'tron'
    if (host.includes('bscscan') || host.includes('binplorer')) preferredNetwork = 'bsc'
    if (host.includes('etherscan')) preferredNetwork = 'ethereum'
    if (
      host.includes('blockstream.info') ||
      host.includes('mempool.space') ||
      host.includes('blockchain.com') ||
      host.includes('blockchair.com')
    ) {
      preferredNetwork = 'bitcoin'
    }
  } catch {
    // Plain hashes are expected here.
  }

  if (hash.startsWith('0x') && evmHashPattern.test(hash)) {
    return { hash, preferredNetwork }
  }

  if (!hash.startsWith('0x') && tronHashPattern.test(hash)) {
    return { hash, preferredNetwork }
  }

  return null
}

export const formatTokenAmount = (rawAmount: string | number, decimals: string | number) => {
  const amountText = String(rawAmount || '0')
  const decimalCount = Number(decimals) || 0
  if (!/^\d+$/.test(amountText) || decimalCount <= 0) {
    return amountFormat.format(Number(amountText) || 0)
  }

  const padded = amountText.padStart(decimalCount + 1, '0')
  const whole = padded.slice(0, -decimalCount)
  const fraction = padded.slice(-decimalCount).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}

const displayCryptoAmount = (amount: string, currency?: string) => {
  const normalizedCurrency = String(currency || '').toUpperCase()
  if (normalizedCurrency === 'USDT' || normalizedCurrency === 'USDC' || normalizedCurrency === 'USD') {
    return `$${amountFormat.format(Number(amount) || 0)}`
  }
  return normalizedCurrency ? `${amount} ${normalizedCurrency}` : amount
}

const loadApiKeys = (): ApiKeys => {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
  const envPaths = [
    process.env.TRANSACTIONER_API_KEYS_PATH,
    resourcesPath ? path.join(resourcesPath, 'private', 'api-keys.env') : '',
    path.join(homedir(), 'dev', 'api-keys.env'),
  ].filter(Boolean) as string[]

  const envPath = envPaths.find(candidate => existsSync(candidate))
  if (!envPath) return {}

  return readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce<ApiKeys>((keys, line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match) {
        keys[match[1] as keyof ApiKeys] = match[2]
      }
      return keys
    }, {})
}

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

const isLookupMissError = (err: unknown) => (
  err instanceof Error && /^HTTP (400|404)$/.test(err.message)
)

const withEuroConversion = async (
  result: ResolveTransactionResult,
  input: ResolveTransactionInput
): Promise<ResolveTransactionResult> => {
  const shouldConvert =
    input.operationType === 'Deposit' &&
    input.roomName === 'Champion Poker' &&
    ['USD', 'USDT', 'USDC'].includes(String(result.currency || '').toUpperCase()) &&
    result.amount

  if (!shouldConvert) return result

  try {
    const conversion = await convertUsdToEur(Number(result.amount) || 0)
    return {
      ...result,
      convertedAmount: conversion.convertedAmount,
      convertedCurrency: conversion.convertedCurrency,
      convertedDisplayAmount: conversion.convertedDisplayAmount,
      fxRate: conversion.fxRate,
      fxDate: conversion.fxDate,
    }
  } catch {
    return result
  }
}

const resolveTronTransaction = async (hash: string, keys: ApiKeys): Promise<ResolveTransactionResult | null> => {
  const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${hash}`
  const data = await fetchJson<TronTransactionResponse>(url, {
    headers: keys.TRONSCAN_API_KEY ? { 'TRON-PRO-API-KEY': keys.TRONSCAN_API_KEY } : undefined,
  })

  if (!data.hash) return null

  const transfer = data.tokenTransferInfo || data.trc20TransferInfo?.[0] || data.transfersAllList?.[0]
  const rawAmount = transfer?.amount_str || transfer?.amount
  const decimals = transfer?.decimals
  const currency = transfer?.symbol
  const amount = rawAmount ? formatTokenAmount(rawAmount, decimals) : undefined

  return {
    success: true,
    status: 'resolved',
    txHash: hash,
    network: 'tron',
    explorerUrl: explorers.tron(hash),
    amount,
    currency,
    displayAmount: amount ? displayCryptoAmount(amount, currency) : undefined,
  }
}

const resolveBscTransaction = async (hash: string): Promise<ResolveTransactionResult | null> => {
  const url = `https://api.binplorer.com/getTxInfo/${hash}?apiKey=freekey`
  const data = await fetchJson<BinplorerTransactionResponse>(url)
  if (!data.hash) return null

  const operation = Array.isArray(data.operations) ? data.operations.find(item => item.type === 'transfer') || data.operations[0] : null
  const amount = operation?.value ? formatTokenAmount(operation.value, operation.tokenInfo?.decimals) : undefined
  const currency = operation?.tokenInfo?.symbol

  return {
    success: true,
    status: 'resolved',
    txHash: hash,
    network: 'bsc',
    explorerUrl: explorers.bsc(hash),
    amount,
    currency,
    displayAmount: amount ? displayCryptoAmount(amount, currency) : undefined,
  }
}

const resolveBitcoinTransaction = async (hash: string): Promise<ResolveTransactionResult | null> => {
  const data = await fetchJson<BitcoinTransactionResponse>(`https://blockstream.info/api/tx/${hash}`)
  if (data.txid !== hash) return null

  return {
    success: true,
    status: 'resolved',
    txHash: hash,
    network: 'bitcoin',
    explorerUrl: explorers.bitcoin(hash),
  }
}

const fetchEtherscanProxy = async (params: Record<string, string>, apiKey: string) => {
  const search = new URLSearchParams({
    chainid: '1',
    module: 'proxy',
    ...params,
    apikey: apiKey,
  })
  return fetchJson<EtherscanProxyResponse>(`https://api.etherscan.io/v2/api?${search.toString()}`)
}

const resolveEthereumTransaction = async (hash: string, keys: ApiKeys): Promise<ResolveTransactionResult | null> => {
  if (!keys.ETHERSCAN_API_KEY) return null

  const receiptData = await fetchEtherscanProxy({
    action: 'eth_getTransactionReceipt',
    txhash: hash,
  }, keys.ETHERSCAN_API_KEY)
  const receipt = receiptData.result
  if (!receipt || typeof receipt !== 'object') return null
  const typedReceipt = receipt as EthereumReceipt

  const transactionData = await fetchEtherscanProxy({
    action: 'eth_getTransactionByHash',
    txhash: hash,
  }, keys.ETHERSCAN_API_KEY)
  const transaction = transactionData.result && typeof transactionData.result === 'object'
    ? transactionData.result as EthereumTransaction
    : null

  const transferLog = Array.isArray(typedReceipt.logs)
    ? typedReceipt.logs.find(log => String(log.topics?.[0]).toLowerCase() === transferTopic && log.data)
    : null

  let amount: string | undefined
  let currency: string | undefined
  if (transferLog) {
    const contract = transferLog.address.toLowerCase()
    const rawAmount = BigInt(transferLog.data).toString()
    const decimalsData = await fetchEtherscanProxy({
      action: 'eth_call',
      to: contract,
      data: '0x313ce567',
      tag: 'latest',
    }, keys.ETHERSCAN_API_KEY)
    const decimals = Number.parseInt(String(decimalsData.result || '0x0'), 16)
    amount = formatTokenAmount(rawAmount, decimals)

    const knownCurrency = knownTokenSymbols.ethereum?.[contract]
    if (knownCurrency) {
      currency = knownCurrency
    } else {
      const symbolData = await fetchEtherscanProxy({
        action: 'eth_call',
        to: contract,
        data: '0x95d89b41',
        tag: 'latest',
      }, keys.ETHERSCAN_API_KEY)
      currency = decodeStringCallResult(symbolData.result) || undefined
    }
  } else if (transaction?.value && transaction.value !== '0x0') {
    amount = formatTokenAmount(BigInt(transaction.value).toString(), 18)
    currency = 'ETH'
  }

  return {
    success: true,
    status: 'resolved',
    txHash: hash,
    network: 'ethereum',
    explorerUrl: explorers.ethereum(hash),
    amount,
    currency,
    displayAmount: amount ? displayCryptoAmount(amount, currency) : undefined,
  }
}

const decodeStringCallResult = (hex: string) => {
  const value = String(hex || '').replace(/^0x/, '')
  if (!value || value === '0') return ''
  try {
    if (value.length === 64) {
      return Buffer.from(value, 'hex').toString('utf8').replace(/\0/g, '').trim()
    }
    const length = Number.parseInt(value.slice(64, 128), 16)
    return Buffer.from(value.slice(128, 128 + length * 2), 'hex').toString('utf8').trim()
  } catch {
    return ''
  }
}

export const resolveTransaction = async (input: ResolveTransactionInput): Promise<ResolveTransactionResult> => {
  const parsed = parseTransactionInput(input.txInput)
  if (!parsed) {
    return { success: false, status: 'invalid', error: 'Не похоже на hash или ссылку транзакции' }
  }

  const cacheKey = `${parsed.hash}:${input.roomName || ''}:${input.operationType || ''}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.result

  try {
    const keys = loadApiKeys()
    const resolvers = parsed.preferredNetwork
      ? [parsed.preferredNetwork]
      : parsed.hash.startsWith('0x')
        ? ['ethereum', 'bsc'] as TransactionNetwork[]
        : ['tron', 'bitcoin'] as TransactionNetwork[]

    for (const network of resolvers) {
      let result: ResolveTransactionResult | null
      try {
        result =
          network === 'tron'
            ? await resolveTronTransaction(parsed.hash, keys)
            : network === 'bsc'
              ? await resolveBscTransaction(parsed.hash)
              : network === 'bitcoin'
                ? await resolveBitcoinTransaction(parsed.hash)
                : await resolveEthereumTransaction(parsed.hash, keys)
      } catch (err) {
        if (isLookupMissError(err)) {
          continue
        }
        throw err
      }

      if (result) {
        const converted = await withEuroConversion(result, input)
        cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, result: converted })
        return converted
      }
    }

    return { success: false, status: 'not_found', txHash: parsed.hash, error: 'Транзакция не найдена в поддерживаемых сетях' }
  } catch (err) {
    return {
      success: false,
      status: 'error',
      txHash: parsed.hash,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
