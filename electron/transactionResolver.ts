import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { convertUsdToEur, formatMoneyAmount } from './currency'

export type TransactionNetwork = 'ethereum' | 'bsc' | 'tron' | 'bitcoin'

export interface KnownTransactionWallet {
  address: string
  roomKey?: string
  roomName?: string
}

interface ResolveTransactionInput {
  txInput: string
  roomName?: string
  operationType?: string
  knownWallets?: KnownTransactionWallet[]
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
  transactionTimestamp?: string
  amount?: string
  currency?: string
  displayAmount?: string
  convertedAmount?: string
  convertedCurrency?: string
  convertedDisplayAmount?: string
  fxRate?: number
  fxDate?: string
  warning?: string
  requiresManualAmount?: boolean
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
  contract_address?: string
  from_address?: string
  fromAddress?: string
  transferFromAddress?: string
  from?: string
  to_address?: string
  toAddress?: string
  transferToAddress?: string
  to?: string
}

interface TronTransactionResponse {
  hash?: string
  block_timestamp?: string | number
  blockTimestamp?: string | number
  timestamp?: string | number
  tokenTransferInfo?: TronTransfer
  trc20TransferInfo?: TronTransfer[]
  transfersAllList?: TronTransfer[]
}

interface BinplorerOperation {
  type?: string
  value?: string
  to?: string
  toAddress?: string
  tokenInfo?: {
    decimals?: string | number
    symbol?: string
  }
}

interface BinplorerTransactionResponse {
  hash?: string
  timestamp?: string | number
  time?: string | number
  blockTime?: string | number
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
  to?: string
  blockNumber?: string
}

interface EthereumBlock {
  timestamp?: string
}

interface BitcoinTransactionResponse {
  txid?: string
  status?: {
    block_time?: number
  }
  vout?: Array<{
    scriptpubkey_address?: string
    value?: number
  }>
}

const cache = new Map<string, { expiresAt: number, result: ResolveTransactionResult }>()
const cacheTtlMs = 10 * 60 * 1000
const evmHashPattern = /^0x[a-fA-F0-9]{64}$/
const tronHashPattern = /^[a-fA-F0-9]{64}$/
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const btcSatsPerBitcoin = 100000000

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

const knownTokenDecimals: Partial<Record<TransactionNetwork, Record<string, number>>> = {
  ethereum: {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,
  },
  bsc: {
    '0x55d398326f99059ff775485246999027b3197955': 18,
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 18,
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

export const displayCryptoAmount = (amount: string, currency?: string) => {
  const normalizedCurrency = String(currency || '').toUpperCase()
  if (normalizedCurrency === 'USDT' || normalizedCurrency === 'USDC' || normalizedCurrency === 'USD') {
    return `$${formatMoneyAmount(Number(amount) || 0)}`
  }
  if (normalizedCurrency === 'EUR') {
    return `€${formatMoneyAmount(Number(amount) || 0)}`
  }
  return normalizedCurrency ? `${amount} ${normalizedCurrency}` : amount
}

const parseTransactionTimestamp = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  let timestamp = typeof value === 'number' ? value : Number.NaN

  if (typeof value === 'string') {
    const trimmed = value.trim()
    timestamp = trimmed.startsWith('0x')
      ? Number.parseInt(trimmed, 16)
      : Number(trimmed)
  }

  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined
  const millis = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  const date = new Date(millis)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

const withTransactionTimestamp = (
  result: ResolveTransactionResult,
  transactionTimestamp?: string
): ResolveTransactionResult => (
  transactionTimestamp ? { ...result, transactionTimestamp } : result
)

const normalizeRoomLookupKey = (value: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')

const normalizeWalletAddress = (value: string) => String(value || '').trim().toLowerCase()

const topicToEvmAddress = (topic: string | undefined) => {
  const value = String(topic || '').trim().toLowerCase()
  if (!/^0x[a-f0-9]{64}$/.test(value)) return ''
  return `0x${value.slice(-40)}`
}

const walletBelongsToRoom = (wallet: KnownTransactionWallet, roomName?: string) => {
  const roomKey = normalizeRoomLookupKey(roomName || '')
  if (!roomKey) return false
  return normalizeRoomLookupKey(wallet.roomName || '') === roomKey ||
    normalizeRoomLookupKey(wallet.roomKey || '') === roomKey
}

const findKnownWallet = (address: string, knownWallets?: KnownTransactionWallet[]) => {
  const normalizedAddress = normalizeWalletAddress(address)
  if (!normalizedAddress) return undefined
  return knownWallets?.find((wallet) => normalizeWalletAddress(wallet.address) === normalizedAddress)
}

const formatWalletRoom = (wallet: KnownTransactionWallet) => wallet.roomName || wallet.roomKey || 'другого рума'

const manualAmountResult = (
  network: TransactionNetwork,
  hash: string,
  warning: string
): ResolveTransactionResult => ({
  success: true,
  status: 'resolved',
  txHash: hash,
  network,
  explorerUrl: explorers[network](hash),
  warning,
  requiresManualAmount: true,
})

const resolveMatchedTransfer = <T>(
  matches: Array<{ value: T, wallet: KnownTransactionWallet }>,
  roomName: string | undefined,
  network: TransactionNetwork,
  hash: string
): { value?: T, manualResult?: ResolveTransactionResult } => {
  const currentRoomMatches = matches.filter((match) => walletBelongsToRoom(match.wallet, roomName))

  if (currentRoomMatches.length === 1) {
    return { value: currentRoomMatches[0].value }
  }

  if (currentRoomMatches.length > 1) {
    return {
      manualResult: manualAmountResult(
        network,
        hash,
        'В этой транзакции несколько переводов на сохраненные кошельки выбранного рума. Обработайте сумму вручную.'
      )
    }
  }

  if (matches.length > 0) {
    const roomNames = Array.from(new Set(matches.map((match) => formatWalletRoom(match.wallet))))
    return {
      manualResult: manualAmountResult(
        network,
        hash,
        `Транзакция найдена, но перевод идет на кошелек ${roomNames.join(', ')}, а не выбранного рума. Сумма не заполнена.`
      )
    }
  }

  return {
    manualResult: manualAmountResult(
      network,
      hash,
      'Транзакция найдена, но среди получателей нет сохраненного кошелька выбранного рума. Сумма не заполнена.'
    )
  }
}

const selectEthereumTransferLog = (
  logs: EthereumLog[] | undefined,
  input: ResolveTransactionInput,
  hash: string
) => {
  const transferLogs = Array.isArray(logs)
    ? logs.filter(log => String(log.topics?.[0]).toLowerCase() === transferTopic && log.data)
    : []
  if (!transferLogs.length) return null

  if (input.knownWallets) {
    const matches = transferLogs
      .map((log) => ({ log, wallet: findKnownWallet(topicToEvmAddress(log.topics?.[2]), input.knownWallets) }))
      .filter((match): match is { log: EthereumLog, wallet: KnownTransactionWallet } => Boolean(match.wallet))
      .map((match) => ({ value: match.log, wallet: match.wallet }))
    return resolveMatchedTransfer(matches, input.roomName, 'ethereum', hash)
  }

  return { value: transferLogs[0] }
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

const tronTransferRecipient = (transfer: TronTransfer | undefined) => (
  transfer?.to_address || transfer?.toAddress || transfer?.transferToAddress || transfer?.to || ''
)

const tronTransferSender = (transfer: TronTransfer | undefined) => (
  transfer?.from_address || transfer?.fromAddress || transfer?.transferFromAddress || transfer?.from || ''
)

const tronTransferDedupKey = (transfer: TronTransfer) => [
  normalizeWalletAddress(transfer.contract_address || ''),
  normalizeWalletAddress(tronTransferSender(transfer)),
  normalizeWalletAddress(tronTransferRecipient(transfer)),
  String(transfer.amount_str || transfer.amount || ''),
  String(transfer.decimals || ''),
  String(transfer.symbol || '').trim().toLowerCase(),
].join('|')

const uniqueTronTransfers = (transfers: TronTransfer[]) => {
  const seen = new Set<string>()
  return transfers.filter((transfer) => {
    const key = tronTransferDedupKey(transfer)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const resolveTronTransaction = async (
  hash: string,
  keys: ApiKeys,
  input: ResolveTransactionInput
): Promise<ResolveTransactionResult | null> => {
  const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${hash}`
  const data = await fetchJson<TronTransactionResponse>(url, {
    headers: keys.TRONSCAN_API_KEY ? { 'TRON-PRO-API-KEY': keys.TRONSCAN_API_KEY } : undefined,
  })

  if (!data.hash) return null
  const transactionTimestamp = parseTransactionTimestamp(data.block_timestamp || data.blockTimestamp || data.timestamp)

  const transfers = [
    data.tokenTransferInfo,
    ...(data.trc20TransferInfo || []),
    ...(data.transfersAllList || []),
  ].filter(Boolean) as TronTransfer[]
  const uniqueTransfers = uniqueTronTransfers(transfers)
  let transfer = uniqueTransfers[0]

  if (input.knownWallets && uniqueTransfers.length > 0) {
    const matches = uniqueTransfers
      .map((item) => ({ transfer: item, wallet: findKnownWallet(tronTransferRecipient(item), input.knownWallets) }))
      .filter((match): match is { transfer: TronTransfer, wallet: KnownTransactionWallet } => Boolean(match.wallet))
      .map((match) => ({ value: match.transfer, wallet: match.wallet }))
    const matched = resolveMatchedTransfer(matches, input.roomName, 'tron', hash)
    if (matched.manualResult) return withTransactionTimestamp(matched.manualResult, transactionTimestamp)
    transfer = matched.value
  }
  if (input.knownWallets && !transfer) {
    return withTransactionTimestamp(manualAmountResult(
      'tron',
      hash,
      'Транзакция найдена, но среди получателей нет сохраненного кошелька выбранного рума. Сумма не заполнена.'
    ), transactionTimestamp)
  }

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
    transactionTimestamp,
    amount,
    currency,
    displayAmount: amount ? displayCryptoAmount(amount, currency) : undefined,
  }
}

const bscOperationRecipient = (operation: BinplorerOperation | undefined) => (
  operation?.to || operation?.toAddress || ''
)

const resolveBscTransaction = async (
  hash: string,
  input: ResolveTransactionInput
): Promise<ResolveTransactionResult | null> => {
  const url = `https://api.binplorer.com/getTxInfo/${hash}?apiKey=freekey`
  const data = await fetchJson<BinplorerTransactionResponse>(url)
  if (!data.hash) return null
  const transactionTimestamp = parseTransactionTimestamp(data.timestamp || data.time || data.blockTime)

  const operations = Array.isArray(data.operations) ? data.operations.filter(item => item.type === 'transfer') : []
  let operation = operations[0] || (Array.isArray(data.operations) ? data.operations[0] : null)

  if (input.knownWallets && operation) {
    const matches = (operations.length ? operations : [operation])
      .map((item) => ({ operation: item, wallet: findKnownWallet(bscOperationRecipient(item), input.knownWallets) }))
      .filter((match): match is { operation: BinplorerOperation, wallet: KnownTransactionWallet } => Boolean(match.wallet))
      .map((match) => ({ value: match.operation, wallet: match.wallet }))
    const matched = resolveMatchedTransfer(matches, input.roomName, 'bsc', hash)
    if (matched.manualResult) return withTransactionTimestamp(matched.manualResult, transactionTimestamp)
    operation = matched.value
  }
  if (input.knownWallets && !operation) {
    return withTransactionTimestamp(manualAmountResult(
      'bsc',
      hash,
      'Транзакция найдена, но среди получателей нет сохраненного кошелька выбранного рума. Сумма не заполнена.'
    ), transactionTimestamp)
  }

  const amount = operation?.value ? formatTokenAmount(operation.value, operation.tokenInfo?.decimals) : undefined
  const currency = operation?.tokenInfo?.symbol

  return {
    success: true,
    status: 'resolved',
    txHash: hash,
    network: 'bsc',
    explorerUrl: explorers.bsc(hash),
    transactionTimestamp,
    amount,
    currency,
    displayAmount: amount ? displayCryptoAmount(amount, currency) : undefined,
  }
}

const formatBitcoinAmount = (sats: number) => {
  const whole = Math.trunc(sats / btcSatsPerBitcoin)
  const fraction = String(Math.abs(sats % btcSatsPerBitcoin)).padStart(8, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : String(whole)
}

const resolveBitcoinTransaction = async (
  hash: string,
  input: ResolveTransactionInput
): Promise<ResolveTransactionResult | null> => {
  const data = await fetchJson<BitcoinTransactionResponse>(`https://blockstream.info/api/tx/${hash}`)
  if (data.txid !== hash) return null
  const transactionTimestamp = parseTransactionTimestamp(data.status?.block_time)

  const outputs = data.vout || []
  let matchedOutput: BitcoinTransactionResponse['vout'][number] | undefined
  if (input.knownWallets) {
    const matches = outputs
      .map((output) => ({
        output,
        wallet: findKnownWallet(output.scriptpubkey_address || '', input.knownWallets)
      }))
      .filter((match): match is { output: BitcoinTransactionResponse['vout'][number], wallet: KnownTransactionWallet } => Boolean(match.wallet))
      .map((match) => ({ value: match.output, wallet: match.wallet }))
    const matched = resolveMatchedTransfer(matches, input.roomName, 'bitcoin', hash)
    if (matched.manualResult) return withTransactionTimestamp(matched.manualResult, transactionTimestamp)
    matchedOutput = matched.value
  }

  const amount = matchedOutput?.value ? formatBitcoinAmount(matchedOutput.value) : undefined

  return {
    success: true,
    status: 'resolved',
    txHash: hash,
    network: 'bitcoin',
    explorerUrl: explorers.bitcoin(hash),
    transactionTimestamp,
    amount,
    currency: amount ? 'BTC' : undefined,
    displayAmount: amount ? displayCryptoAmount(amount, 'BTC') : undefined,
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

const fetchEthereumTransactionTimestamp = async (blockNumber: string | undefined, apiKey: string) => {
  if (!blockNumber) return undefined
  try {
    const blockData = await fetchEtherscanProxy({
      action: 'eth_getBlockByNumber',
      tag: blockNumber,
      boolean: 'false',
    }, apiKey)
    const block = blockData.result && typeof blockData.result === 'object'
      ? blockData.result as EthereumBlock
      : null
    return parseTransactionTimestamp(block?.timestamp)
  } catch {
    return undefined
  }
}

const resolveEthereumTransaction = async (
  hash: string,
  keys: ApiKeys,
  input: ResolveTransactionInput
): Promise<ResolveTransactionResult | null> => {
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
  const transactionTimestamp = await fetchEthereumTransactionTimestamp(transaction?.blockNumber, keys.ETHERSCAN_API_KEY)

  const selectedTransferLog = selectEthereumTransferLog(typedReceipt.logs, input, hash)
  if (selectedTransferLog?.manualResult) return withTransactionTimestamp(selectedTransferLog.manualResult, transactionTimestamp)
  const transferLog = selectedTransferLog?.value

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
    const knownDecimals = knownTokenDecimals.ethereum?.[contract]
    const fetchedDecimals = Number.parseInt(String(decimalsData.result || '0x0'), 16)
    const decimals = fetchedDecimals > 0 ? fetchedDecimals : knownDecimals
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
    if (input.knownWallets) {
      const wallet = findKnownWallet((transaction as EthereumTransaction & { to?: string }).to || '', input.knownWallets)
      const matched = resolveMatchedTransfer(
        wallet ? [{ value: transaction, wallet }] : [],
        input.roomName,
        'ethereum',
        hash
      )
      if (matched.manualResult) return withTransactionTimestamp(matched.manualResult, transactionTimestamp)
    }
    amount = formatTokenAmount(BigInt(transaction.value).toString(), 18)
    currency = 'ETH'
  }

  if (input.knownWallets && !amount) {
    return withTransactionTimestamp(manualAmountResult(
      'ethereum',
      hash,
      'Транзакция найдена, но среди получателей нет сохраненного кошелька выбранного рума. Сумма не заполнена.'
    ), transactionTimestamp)
  }

  return {
    success: true,
    status: 'resolved',
    txHash: hash,
    network: 'ethereum',
    explorerUrl: explorers.ethereum(hash),
    transactionTimestamp,
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

  const walletKey = (input.knownWallets || [])
    .map((wallet) => `${normalizeRoomLookupKey(wallet.roomKey || wallet.roomName || '')}:${normalizeWalletAddress(wallet.address)}`)
    .filter((value) => !value.endsWith(':'))
    .sort()
    .join(',')
  const cacheKey = `${parsed.hash}:${input.roomName || ''}:${input.operationType || ''}:${walletKey}`
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
            ? await resolveTronTransaction(parsed.hash, keys, input)
            : network === 'bsc'
              ? await resolveBscTransaction(parsed.hash, input)
              : network === 'bitcoin'
                ? await resolveBitcoinTransaction(parsed.hash, input)
                : await resolveEthereumTransaction(parsed.hash, keys, input)
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
