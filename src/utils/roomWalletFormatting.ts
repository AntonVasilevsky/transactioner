const normalizeFeeText = (value: string) => value
  .trim()
  .toLocaleLowerCase()
  .replace(/\s+/g, ' ')

/** Player comments with ready RU / EN / ES text (T-0019, owner chose a phrase list). */
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

/** A player comment the operator added once with its own translations. */
export type RoomWalletCommentPhrase = Record<RoomLanguage, string>

const percentageFeePattern = /^(\d+(?:[.,]\d+)?\s*%)\s*(?:комиссия|fee|de comisión)$/

const findPhrase = (normalized: string, customPhrases: RoomWalletCommentPhrase[]) => (
  feeTextTranslations.find(({ variants }) => variants.includes(normalized))?.translations ||
  customPhrases.find((phrase) => (['RU', 'EN', 'ES'] as RoomLanguage[]).some((language) => normalizeFeeText(phrase[language] || '') === normalized))
)

/** True when the comment reaches EN and ES players translated (a known phrase or "N% комиссия"). */
export const isTranslatedRoomWalletComment = (value: string | null | undefined, customPhrases: RoomWalletCommentPhrase[] = []) => {
  const normalized = normalizeFeeText(String(value || ''))
  return !normalized || Boolean(findPhrase(normalized, customPhrases)) || percentageFeePattern.test(normalized)
}

export const localizeRoomWalletFeeText = (
  value: string | null | undefined,
  language: RoomLanguage,
  customPhrases: RoomWalletCommentPhrase[] = []
) => {
  const original = String(value || '').trim()
  if (!original) return ''

  const normalized = normalizeFeeText(original)
  const phrase = findPhrase(normalized, customPhrases)
  if (phrase) return phrase[language] || original

  const commissionMatch = normalized.match(percentageFeePattern)
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
  language: RoomLanguage,
  customPhrases: RoomWalletCommentPhrase[] = []
) => {
  const base = `${wallet.currency} ${wallet.network}`.trim()
  const fee = localizeRoomWalletFeeText(method?.fee_text || wallet.fee_text, language, customPhrases)
  return fee ? `${base} (${fee})` : base
}

export const roomWalletCopyText = (
  wallet: RoomWalletInfo,
  method: RoomPaymentMethodInfo | undefined,
  language: RoomLanguage,
  customPhrases: RoomWalletCommentPhrase[] = []
) => [
  roomWalletDisplayTitle(wallet, method, language, customPhrases),
  wallet.wallet_address,
].filter(Boolean).join('\n')

const depositWalletHeading: Record<RoomLanguage, { one: string, many: string }> = {
  RU: { one: 'кошелёк для депозита', many: 'депозитные кошельки' },
  EN: { one: 'deposit wallet', many: 'deposit wallets' },
  ES: { one: 'billetera de depósito', many: 'billeteras de depósito' },
}

/** The one heading for copied deposit wallets, in every room and language: "<Room> — …". */
export const roomWalletListTitle = (roomTitle: string, language: RoomLanguage, walletCount = 2) => {
  const heading = depositWalletHeading[language] || depositWalletHeading.RU
  return `${roomTitle} — ${walletCount === 1 ? heading.one : heading.many}`
}

/** One wallet copied on its own gets the same heading in the singular. */
export const roomSingleWalletCopyText = (
  roomTitle: string,
  wallet: RoomWalletInfo,
  method: RoomPaymentMethodInfo | undefined,
  language: RoomLanguage,
  customPhrases: RoomWalletCommentPhrase[] = []
) => [roomWalletListTitle(roomTitle, language, 1), roomWalletCopyText(wallet, method, language, customPhrases)].join('\n\n')

export const ROOM_WALLET_COMMENT_PHRASES: Array<Record<RoomLanguage, string>> = feeTextTranslations.map(({ translations }) => translations)
