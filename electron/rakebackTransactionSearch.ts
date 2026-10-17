import { ExplorerNotConfiguredError, fetchIncomingTransfers, normalizeAddress } from './explorerTransfers'
import { transferSourceFor } from '../src/utils/explorerNetworks'
import { rakebackSenderWalletAddresses } from '../src/utils/rakebackSettings'

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

const parseAmountValue = (value: string) => {
  const normalized = String(value || '').replace(',', '.').replace(/[^\d.]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
const startOfDateInput = (value: string) => new Date(`${value}T00:00:00.000`).getTime()
const endOfDateInput = (value: string) => new Date(`${value}T23:59:59.999`).getTime()
const amountDistance = (actual: number, expected: number | null) => (
  expected === null ? 0 : Math.abs(actual - expected)
)
const formatTransactionDate = (milliseconds: number) => {
  const date = new Date(milliseconds)
  if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime())) return ''
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getUTCFullYear()}`
}

/** Rakeback payouts are token transfers (USDT / USDC) from our sender wallets to the player's wallet. */
export const searchRakebackTransaction = async (
  input: SearchRakebackTransactionInput
): Promise<SearchRakebackTransactionResult> => {
  try {
    const source = transferSourceFor(input.network)
    if (!source || (source.kind !== 'tron-token' && source.kind !== 'bsc-token' && source.kind !== 'evm-token')) {
      return { success: false, status: 'not_configured', error: 'Для этой сети автоматический поиск пока не подключён. Можно вставить TX вручную.' }
    }

    const affiliateWallets = rakebackSenderWalletAddresses(input.affiliateWallets)
    if (!affiliateWallets.size) {
      return { success: false, status: 'not_configured', error: 'Добавьте кошелек, с которого отправляется рейкбек.' }
    }

    const expectedAmount = parseAmountValue(input.amount)
    const startMs = startOfDateInput(input.periodFrom)
    const endMs = endOfDateInput(input.periodTo)
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
      throw new Error('Некорректный период поиска')
    }

    const candidates = (await fetchIncomingTransfers(source, input.wallet, startMs, endMs))
      .filter(item => affiliateWallets.has(normalizeAddress(item.from)))
      .map(item => ({
        hash: item.hash,
        amount: item.amount,
        from: item.from,
        date: formatTransactionDate(item.timestampMs),
        explorerUrl: item.explorerUrl,
        actualAmount: Number(item.amount),
      }))
      .sort((left, right) => amountDistance(left.actualAmount, expectedAmount) - amountDistance(right.actualAmount, expectedAmount))

    return candidates.length
      ? { success: true, status: 'found', candidates }
      : { success: false, status: 'not_found', candidates: [] }
  } catch (err) {
    if (err instanceof ExplorerNotConfiguredError) return { success: false, status: 'not_configured', error: err.message }
    return { success: false, status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}
