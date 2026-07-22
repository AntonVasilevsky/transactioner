export type AmountCurrency = 'EUR' | 'USD'
type AmountOperationType = 'Deposit' | 'Withdrawal'
export type TransactionTemplateLanguage = 'EN' | 'ES'

interface TransactionTemplateAccountLineInput {
  language: TransactionTemplateLanguage
  roomName: string
  roomUsername: string
  roomPlayerId?: string | null
  email?: string | null
}

const slashSeparated = (...parts: Array<string | null | undefined>) =>
  parts.map(part => String(part || '').trim()).filter(Boolean).join(' / ')

export const transactionTemplateAccountLine = ({
  language,
  roomName,
  roomUsername,
  roomPlayerId,
  email,
}: TransactionTemplateAccountLineInput) => {
  if (language === 'ES') {
    return roomName === 'Nexa'
      ? slashSeparated(roomUsername, roomPlayerId)
      : slashSeparated(roomUsername)
  }

  return roomName === 'Nexa'
    ? slashSeparated(roomUsername, roomPlayerId, email)
    : slashSeparated(roomUsername, email)
}

const numberFormatSymbols = /[€$]/g

export const cleanCurrencyNumber = (value: string) => String(value || '')
  .trim()
  .replace(/^(?:EUR|USD)\s+/i, '')
  .replace(/^[€$]\s*/, '')

export const amountWithCurrency = (value: string, currency: AmountCurrency) => {
  const trimmed = value.trim()
  if (!trimmed) return value
  const amountValue = cleanCurrencyNumber(trimmed)
  return `${currency} ${amountValue}`
}

export const defaultAmountCurrencyForRoom = (
  roomName: string,
  operationType: AmountOperationType
): AmountCurrency => (
  roomName === 'RedStar' && operationType === 'Withdrawal'
    ? 'EUR'
    : roomName === 'Champion Poker'
      ? 'EUR'
      : 'USD'
)

export const euroSymbolAmount = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return value
  return `€${cleanCurrencyNumber(trimmed)}`
}

const isCryptoDisplayAmount = (value: string) => (
  /\b(?:BTC|ETH|BNB|TRX)\b$/i.test(value.trim())
)

export const currencySymbolAmount = (value: string, currency: AmountCurrency) => {
  const trimmed = value.trim()
  if (!trimmed) return value
  if (isCryptoDisplayAmount(trimmed)) return trimmed
  return `${currency === 'EUR' ? '€' : '$'}${cleanCurrencyNumber(trimmed)}`
}

export const championDepositTemplateAmount = (
  value: string,
  currency: AmountCurrency,
  convertedAmount = ''
) => {
  if (isCryptoDisplayAmount(value)) return value.trim()
  if (currency === 'USD') return convertedAmount || amountWithCurrency(value, 'USD')
  return euroSymbolAmount(value)
}

export const championWithdrawalTemplateAmount = (
  value: string,
  currency: AmountCurrency,
  convertedAmount = ''
) => {
  if (currency === 'USD') return convertedAmount || amountWithCurrency(value, 'USD')
  return amountWithCurrency(value, 'EUR')
}

const normalizeMethodText = (value: string) => String(value || '').toUpperCase()
  .replace(/[()/_-]+/g, ' ')
  .replace(/\bETHEREUM\b/g, 'ETH')
  .replace(/\s+/g, ' ')
  .trim()

type PaymentOperationType = 'Deposit' | 'Withdrawal'

interface PaymentMethodLike {
  room_key: string
  deal_type?: string
  operation_type: PaymentOperationType
  method_name?: string
  currency?: string
  network?: string
  limits_text?: string | null
  is_active?: number | boolean
}

interface WalletOptionLike {
  room_key: string
  deal_type?: string
  currency?: string
  network?: string
  is_active?: number | boolean
}

interface RoomProfileLike {
  room_key: string
  display_name: string
}

export interface RoomPaymentWarningInput {
  roomName: string
  operationType: PaymentOperationType
  method: string
  amount: string
  profiles: RoomProfileLike[]
  paymentMethods: PaymentMethodLike[]
  walletOptions: WalletOptionLike[]
}

const operationLabelRu: Record<PaymentOperationType, string> = {
  Deposit: 'депозита',
  Withdrawal: 'вывода'
}

const normalizeRoomIdentity = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')

const isActiveRow = (value?: number | boolean) => value !== false && value !== 0

const uniqueLabels = (values: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeMethodText(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export const paymentMethodLabel = (value: {
  method_name?: string | null
  currency?: string | null
  network?: string | null
}) => {
  const currency = String(value.currency || '').trim()
  const network = String(value.network || '').trim()
  const methodName = String(value.method_name || '').trim()
  if (currency) return `${currency} ${network}`.trim()
  if (methodName) return `${methodName} ${network}`.trim()
  return network
}

const methodTextMatches = (candidate: string, input: string) => {
  const normalizedCandidate = normalizeMethodText(candidate)
  const normalizedInput = normalizeMethodText(input)
  if (!normalizedCandidate || !normalizedInput) return false
  if (normalizedCandidate === normalizedInput) return true
  if (normalizedCandidate.includes(normalizedInput) || normalizedInput.includes(normalizedCandidate)) return true

  const candidateTokens = new Set(normalizedCandidate.split(' ').filter(Boolean))
  const inputTokens = normalizedInput.split(' ').filter(Boolean)
  if (/[|/]/.test(candidate)) {
    return inputTokens.some((token) => token.length > 2 && candidateTokens.has(token))
  }
  return inputTokens.every((token) => candidateTokens.has(token))
}

const methodTokens = (value: string) => normalizeMethodText(value).split(' ').filter(Boolean)

const candidateTokens = (candidate: PaymentMethodLike) => methodTokens([
  candidate.method_name,
  candidate.currency,
  candidate.network,
].filter(Boolean).join(' '))

const currencyTokens = (candidate: PaymentMethodLike) => methodTokens(String(candidate.currency || candidate.method_name || ''))
  .filter((token) => /^(?:USDT|USDC|BTC|ETH|SKRILL|EUR|USD)$/.test(token))

const matchingMethods = (candidates: PaymentMethodLike[], method: string) => (
  candidates.filter((candidate) => methodTextMatches(paymentMethodLabel(candidate), method))
)

const bestLimitMatch = (candidates: PaymentMethodLike[], method: string) => {
  const methodTokenSet = new Set(methodTokens(method))
  const matches = matchingMethods(candidates.filter((candidate) => Boolean(candidate.limits_text)), method)
  if (matches.length === 0) return { match: null, ambiguousLabels: [] as string[] }

  const currencyMatches = matches.filter((candidate) => (
    currencyTokens(candidate).some((token) => methodTokenSet.has(token))
  ))
  const scopedMatches = currencyMatches.length ? currencyMatches : matches
  const scored = scopedMatches
    .map((candidate) => {
      const label = normalizeMethodText(paymentMethodLabel(candidate))
      const tokens = candidateTokens(candidate)
      const exactScore = label === normalizeMethodText(method) ? 100 : 0
      const tokenScore = tokens.filter((token) => methodTokenSet.has(token)).length
      const specificityScore = tokens.length
      return { candidate, score: exactScore + tokenScore * 10 + specificityScore }
    })
    .sort((left, right) => right.score - left.score)

  const topScore = scored[0]?.score ?? 0
  const topMatches = scored.filter((item) => item.score === topScore).map((item) => item.candidate)
  const ambiguousLabels = currencyMatches.length === 0 && topMatches.length > 1
    ? uniqueLabels(topMatches.map(paymentMethodLabel))
    : []

  return { match: scored[0]?.candidate || null, ambiguousLabels }
}

const parseMinimumAmount = (value: string) => {
  const normalized = String(value || '')
    .replace(numberFormatSymbols, '')
    .replace(/(?:EUR|USD|USDT|USDC|BTC|ETH|TRX|BNB)\b/gi, '')
    .replace(/\s+/g, '')
    .replace(',', '.')
  const match = normalized.match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

export const resolveRoomPaymentWarning = ({
  roomName,
  operationType,
  method,
  amount,
  profiles,
  paymentMethods,
  walletOptions,
}: RoomPaymentWarningInput) => {
  const trimmedMethod = method.trim()
  if (!trimmedMethod) return ''

  const normalizedRoom = normalizeRoomIdentity(roomName)
  const roomKeys = profiles
    .filter((profile) => (
      normalizeRoomIdentity(profile.display_name) === normalizedRoom ||
      normalizeRoomIdentity(profile.room_key) === normalizedRoom
    ))
    .map((profile) => profile.room_key)

  if (roomKeys.length === 0) return ''
  const roomKeySet = new Set(roomKeys)

  const activeMethods = paymentMethods.filter((candidate) => (
    roomKeySet.has(candidate.room_key) &&
    candidate.operation_type === operationType &&
    isActiveRow(candidate.is_active)
  ))
  const activeDepositMethods = paymentMethods.filter((candidate) => (
    roomKeySet.has(candidate.room_key) &&
    candidate.operation_type === 'Deposit' &&
    isActiveRow(candidate.is_active)
  ))

  const activeWalletMethods = walletOptions
    .filter((candidate) => (
      roomKeySet.has(candidate.room_key) &&
      isActiveRow(candidate.is_active)
    ))
    .map((candidate) => ({
      room_key: candidate.room_key,
      deal_type: candidate.deal_type,
      operation_type: 'Deposit',
      method_name: '',
      currency: candidate.currency || '',
      network: candidate.network || '',
      limits_text: null,
      is_active: candidate.is_active,
    } satisfies PaymentMethodLike))

  const candidates = operationType === 'Withdrawal'
    ? [...activeDepositMethods, ...activeWalletMethods]
    : [...activeMethods, ...activeWalletMethods]
  if (candidates.length === 0) return ''

  const matched = matchingMethods(candidates, trimmedMethod)[0]
  const availableText = uniqueLabels(candidates.map(paymentMethodLabel)).join(', ')
  if (!matched) {
    if (operationType === 'Withdrawal') {
      return `Недоступная сеть вывода ${roomName}: ${trimmedMethod}. Попросите другой кошелек. Доступные методы: ${availableText}.`
    }
    return `Недоступный метод ${operationLabelRu[operationType]} ${roomName}: ${trimmedMethod}. Доступные методы: ${availableText}.`
  }

  const { match: limitMatch, ambiguousLabels } = bestLimitMatch(activeMethods, trimmedMethod)
  if (operationType === 'Withdrawal' && ambiguousLabels.length > 1) {
    return `Укажите монету для вывода ${roomName}: ${trimmedMethod}. Для этой сети есть разные лимиты: ${ambiguousLabels.join(', ')}.`
  }

  if (!limitMatch?.limits_text) return ''
  if (isNonEurCryptoAmount(amount)) return ''

  const minimum = parseMinimumAmount(limitMatch.limits_text)
  if (minimum === null || Number.isNaN(minimum)) return ''

  const parsedAmount = parseTemplateAmountNumber(amount)
  if (parsedAmount === null || Number.isNaN(parsedAmount)) return ''
  if (parsedAmount >= minimum) return ''

  return `Минимальная сумма ${operationLabelRu[operationType]} ${roomName} для ${paymentMethodLabel(limitMatch)}: ${limitMatch.limits_text}. Сейчас указано ${parsedAmount}.`
}

export const parseTemplateAmountNumber = (value: string) => {
  const normalized = String(value || '')
    .replace(numberFormatSymbols, '')
    .replace(/(?:EUR|USD)\b/gi, '')
    .replace(/\s+/g, '')
    .replace(',', '.')
  const match = normalized.match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

const isNonEurCryptoAmount = (value: string) => (
  /\b(?:BTC|ETH|BNB|TRX)\b/i.test(value) && !/(?:EUR|€)/i.test(value)
)
