export interface CurrencyConversionResult {
  inputAmount: string
  inputCurrency: 'USD'
  convertedAmount: string
  convertedCurrency: 'EUR'
  convertedDisplayAmount: string
  fxRate: number
  fxDate: string
}

const moneyFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
})

export const parseCurrencyAmount = (value: string) => {
  const cleaned = String(value || '')
    .replace(/[^\d.,-]/g, '')
    .trim()

  if (!cleaned) return null

  const normalized = cleaned.includes('.') && cleaned.includes(',')
    ? cleaned.replace(/,/g, '')
    : cleaned.replace(',', '.')
  const amount = Number(normalized)

  return Number.isFinite(amount) ? amount : null
}

export const formatMoneyAmount = (amount: number) => moneyFormat.format(amount).replace(/\.00$/, '')

export const convertUsdToEur = async (usdAmount: number): Promise<CurrencyConversionResult> => {
  const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR')
  if (!response.ok) {
    throw new Error(`Currency API HTTP ${response.status}`)
  }

  const data = await response.json() as { date: string, rates?: { EUR?: number } }
  const rate = data.rates?.EUR
  if (!rate) {
    throw new Error('Курс USD/EUR не найден')
  }

  const convertedAmount = formatMoneyAmount(usdAmount * rate)
  return {
    inputAmount: formatMoneyAmount(usdAmount),
    inputCurrency: 'USD',
    convertedAmount,
    convertedCurrency: 'EUR',
    convertedDisplayAmount: `€${convertedAmount}`,
    fxRate: rate,
    fxDate: data.date,
  }
}
