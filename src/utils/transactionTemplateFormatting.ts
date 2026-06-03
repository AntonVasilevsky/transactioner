export type AmountCurrency = 'EUR' | 'USD'

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

export const euroSymbolAmount = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return value
  return `€${cleanCurrencyNumber(trimmed)}`
}

export const championDepositTemplateAmount = (
  value: string,
  currency: AmountCurrency,
  convertedAmount = ''
) => {
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
