export const TRANSACTION_REFERENCE_WALLET_ERROR =
  'Похоже, указан хеш или ссылка на транзакцию. Введите адрес кошелька для выплат.'

const EVM_TRANSACTION_HASH_PATTERN = /^0x[a-f0-9]{64}$/i
const HEX_TRANSACTION_ID_PATTERN = /^[a-f0-9]{64}$/i
const TRANSACTION_URL_PATTERN = /^https?:\/\/\S*(?:\/tx\/|\/transaction\/|[?&](?:txid|transaction)=)\S*$/i

export const isLikelyTransactionReference = (value: string): boolean => {
  const normalized = String(value || '').trim()
  if (!normalized) return false

  return EVM_TRANSACTION_HASH_PATTERN.test(normalized)
    || HEX_TRANSACTION_ID_PATTERN.test(normalized)
    || TRANSACTION_URL_PATTERN.test(normalized)
}

export const getWalletAddressValidationError = (
  value: string | null | undefined
): string | null => (
  isLikelyTransactionReference(String(value || ''))
    ? TRANSACTION_REFERENCE_WALLET_ERROR
    : null
)

const normalizeWalletNetwork = (value: string) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')

const EVM_WALLET_PATTERN = /^0x[a-f0-9]{40}$/i
const TRON_WALLET_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/
const BTC_WALLET_PATTERN = /^(?:bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i
const EMAIL_LIKE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isCryptoWalletNetwork = (network: string): boolean => {
  const normalized = normalizeWalletNetwork(network)
  if (!normalized) return false
  if (/\b(?:SKRILL|LUXON|NETELLER|PAYPAL|BANK|WIRE|CARD)\b/.test(normalized)) return false
  return /\b(?:BTC|BITCOIN|TRC20|TRON|ERC20|BEP20|ETH|ETHEREUM|BNB|BSC|USDT|USDC|TRX)\b/.test(normalized)
}

export const getWalletNetworkValidationWarning = (
  value: string | null | undefined,
  network: string | null | undefined
): string | null => {
  const wallet = String(value || '').trim()
  const normalizedNetwork = normalizeWalletNetwork(String(network || ''))
  const transactionReferenceError = getWalletAddressValidationError(wallet)
  if (transactionReferenceError) return transactionReferenceError
  if (!wallet || !normalizedNetwork) return null

  if (/\b(?:TRC20|TRON|TRX)\b/.test(normalizedNetwork) && !TRON_WALLET_PATTERN.test(wallet)) {
    if (wallet.startsWith('0x')) {
      return 'Для TRC20 нужен TRON-адрес. Обычно он начинается с T, а не с 0x.'
    }
    return 'Проверьте адрес TRC20: TRON-кошелёк обычно начинается с T и содержит 34 символа.'
  }

  if (/\b(?:ERC20|BEP20|ETH|ETHEREUM|BNB|BSC)\b/.test(normalizedNetwork) && !EVM_WALLET_PATTERN.test(wallet)) {
    if (wallet.startsWith('T')) {
      return 'Для ERC20/BEP20 нужен EVM-адрес. Обычно он начинается с 0x, а не с T.'
    }
    return 'Проверьте EVM-адрес: для ERC20/BEP20 он должен начинаться с 0x и содержать 42 символа.'
  }

  if (/\b(?:BTC|BITCOIN)\b/.test(normalizedNetwork) && !BTC_WALLET_PATTERN.test(wallet)) {
    return 'Проверьте BTC-адрес: обычно он начинается с bc1, 1 или 3.'
  }

  if (/\b(?:SKRILL|LUXON)\b/.test(normalizedNetwork) && !EMAIL_LIKE_PATTERN.test(wallet)) {
    return 'Для Skrill/Luxon обычно нужен email. Проверьте формат сохранённого кошелька.'
  }

  return null
}
