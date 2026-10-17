import { parseTimeOfDay } from './timeOfDay'

/**
 * Finding a deposit the player sent without a hash, from the screenshot (T-0027, owner 2026-10-15):
 * the operator picks our wallet and types the transfer amount; the search looks at the last
 * 2 hours, or at the 2 hours before the message time when the operator gives it.
 */
export const DEPOSIT_SEARCH_WINDOW_MS = 2 * 60 * 60 * 1000
/**
 * The operator types the message time roughly, to the hour (14:00 for a message at 14:36, owner
 * 2026-10-17), and an exchange may put the transfer on chain after a "Processing" screenshot.
 */
export const DEPOSIT_SEARCH_AFTER_MESSAGE_MS = 60 * 60 * 1000

export interface DepositSearchWindow {
  startMs: number
  endMs: number
}

export const depositSearchWindow = (nowMs: number, messageMs?: number | null): DepositSearchWindow =>
  messageMs
    ? { startMs: messageMs - DEPOSIT_SEARCH_WINDOW_MS, endMs: messageMs + DEPOSIT_SEARCH_AFTER_MESSAGE_MS }
    : { startMs: nowMs - DEPOSIT_SEARCH_WINDOW_MS, endMs: nowMs }

/**
 * The message time as the messenger shows it ("13:12", "1312", "13.12") on the given local date,
 * or today; a time that has not come yet today means yesterday (a request left from the night).
 */
export const resolveMessageTime = (timeText: string, dateText: string, now: Date): Date | null => {
  const time = parseTimeOfDay(timeText)
  if (!time) return null
  const date = dateText ? new Date(`${dateText}T00:00:00`) : new Date(now)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(time.hour, time.minute, 0, 0)
  if (!dateText && date.getTime() > now.getTime()) date.setDate(date.getDate() - 1)
  return date
}

const amountNumber = (value: string) => {
  const normalized = String(value || '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '')
  if (!normalized || normalized.split('.').length > 2) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? { value: parsed, decimals: (normalized.split('.')[1] || '').length } : null
}

export const isDepositSearchAmount = (value: string) => amountNumber(value) !== null

/**
 * The transfer amount equals the typed one to the cent, or to as many decimals as were typed
 * ("0.0015" BTC). Zero and dust transfers never match.
 */
export const depositAmountMatches = (actual: string, expected: string) => {
  const target = amountNumber(expected)
  const got = Number(actual)
  if (!target || !Number.isFinite(got) || got <= 0) return false
  const scale = 10 ** Math.max(2, target.decimals)
  return Math.round(got * scale) === Math.round(target.value * scale)
}
