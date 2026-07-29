const normalizeFeeText = (value: string) => value
  .trim()
  .toLocaleLowerCase()
  .replace(/\s+/g, ' ')

const feeTextTranslations: Array<{
  variants: string[]
  translations: Record<RoomLanguage, string>
}> = [
  {
    variants: ['без комиссии', 'no fee', 'sin comisión'],
    translations: {
      RU: 'без комиссии',
      EN: 'no fee',
      ES: 'sin comisión',
    },
  },
  {
    variants: [
      'уточнить перед переводом',
      'confirm before transfer',
      'confirm before transferring',
      'confirmar antes de transferir',
    ],
    translations: {
      RU: 'уточнить перед переводом',
      EN: 'confirm before transferring',
      ES: 'confirmar antes de transferir',
    },
  },
  {
    variants: [
      'через нас, p2p',
      'through us, p2p',
      'via us, p2p',
      'a través de nosotros, p2p',
    ],
    translations: {
      RU: 'через нас, p2p',
      EN: 'through us, P2P',
      ES: 'a través de nosotros, P2P',
    },
  },
]

export const localizeRoomWalletFeeText = (
  value: string | null | undefined,
  language: RoomLanguage
) => {
  const original = String(value || '').trim()
  if (!original) return ''

  const normalized = normalizeFeeText(original)
  const standardTranslation = feeTextTranslations.find(({ variants }) => (
    variants.includes(normalized)
  ))
  if (standardTranslation) return standardTranslation.translations[language]

  const commissionMatch = normalized.match(
    /^(\d+(?:[.,]\d+)?\s*%)\s*(?:комиссия|fee|de comisión)$/
  )
  if (commissionMatch) {
    const percentage = commissionMatch[1].replace(/\s+/g, '')
    if (language === 'EN') return `${percentage} fee`
    if (language === 'ES') return `${percentage} de comisión`
    return `${percentage} комиссия`
  }

  return original
}

export const roomWalletDisplayTitle = (
  wallet: RoomWalletInfo,
  method: RoomPaymentMethodInfo | undefined,
  language: RoomLanguage
) => {
  const base = `${wallet.currency} ${wallet.network}`.trim()
  const fee = localizeRoomWalletFeeText(method?.fee_text || wallet.fee_text, language)
  return fee ? `${base} (${fee})` : base
}

export const roomWalletCopyText = (
  wallet: RoomWalletInfo,
  method: RoomPaymentMethodInfo | undefined,
  language: RoomLanguage
) => [
  roomWalletDisplayTitle(wallet, method, language),
  wallet.wallet_address,
].filter(Boolean).join('\n')

export const roomWalletListTitle = (roomTitle: string, language: RoomLanguage) => {
  if (language === 'EN') return `${roomTitle} - deposit wallets`
  if (language === 'ES') return `${roomTitle} - billeteras de depósito`
  return `${roomTitle} — депозитные кошельки`
}
