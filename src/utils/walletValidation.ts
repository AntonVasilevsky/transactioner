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
