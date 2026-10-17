import { ExplorerNotConfiguredError, fetchIncomingTransfers, type IncomingTransfer } from './explorerTransfers'
import { transferSourceFor } from '../src/utils/explorerNetworks'
import { depositAmountMatches, depositSearchWindow, isDepositSearchAmount, type DepositSearchWindow } from '../src/utils/depositTransferSearch'

export interface SearchDepositTransfersInput {
  currency: string
  network: string
  wallet: string
  amount: string
  /** ISO time of the player's message; empty = search the last 2 hours. */
  messageTime?: string
}

export interface SearchDepositTransfersResult {
  success: boolean
  status: 'found' | 'not_found' | 'not_configured' | 'error'
  candidates: IncomingTransfer[]
  window?: DepositSearchWindow
  error?: string
}

/** Deposits without a hash (T-0027): incoming transfers of exactly this amount to our wallet in the window, newest first. */
export const searchDepositTransfers = async (input: SearchDepositTransfersInput, nowMs = Date.now()): Promise<SearchDepositTransfersResult> => {
  const source = transferSourceFor(`${input.currency || ''} ${input.network || ''}`)
  if (!source) {
    return { success: false, status: 'not_configured', candidates: [], error: 'Для этой сети поиск переводов пока не подключён.' }
  }
  if (!String(input.wallet || '').trim()) return { success: false, status: 'error', candidates: [], error: 'Выберите кошелёк' }
  if (!isDepositSearchAmount(input.amount)) return { success: false, status: 'error', candidates: [], error: 'Введите сумму перевода' }
  const messageMs = input.messageTime ? Date.parse(input.messageTime) : null
  if (input.messageTime && !Number.isFinite(messageMs)) return { success: false, status: 'error', candidates: [], error: 'Некорректное время сообщения' }
  const window = depositSearchWindow(nowMs, messageMs)

  try {
    const candidates = (await fetchIncomingTransfers(source, input.wallet, window.startMs, window.endMs, nowMs))
      .filter(item => depositAmountMatches(item.amount, input.amount))
      .sort((left, right) => right.timestampMs - left.timestampMs)
    return candidates.length
      ? { success: true, status: 'found', candidates, window }
      : { success: true, status: 'not_found', candidates: [], window }
  } catch (err) {
    if (err instanceof ExplorerNotConfiguredError) return { success: false, status: 'not_configured', candidates: [], window, error: err.message }
    return { success: false, status: 'error', candidates: [], window, error: err instanceof Error ? err.message : String(err) }
  }
}
