/**
 * The one list of messengers: link-verification options, the Directus value for Sheet 2
 * and the contact type of a player card. Matching rules are kept exactly as they were,
 * so the generated texts and TSV rows do not change.
 */
export type ContactMethodKey = 'TG' | 'WA' | 'Discord' | 'Teams' | 'Email'

export interface MessengerDefinition {
  label: string
  /** Short codes typed by operators that mean this messenger (case-insensitive). */
  labelAliases: string[]
  /**
   * Directus value: `email` writes the player's email; otherwise `prefix: contact`, matched when
   * the messenger text equals one of `equals` or contains one of `contains`.
   */
  directus: 'email' | { prefix: string, equals: string[], contains: string[] }
  /** Contact type in a player card, or null when a player card has no such contact. */
  contactMethod: ContactMethodKey | null
}

export const MESSENGERS: MessengerDefinition[] = [
  { label: 'Telegram', labelAliases: ['tg'], directus: { prefix: 'telegram', equals: [], contains: ['telegram'] }, contactMethod: 'TG' },
  { label: 'WA', labelAliases: ['wa'], directus: { prefix: 'whatsapp', equals: ['wa'], contains: ['whatsapp'] }, contactMethod: 'WA' },
  { label: 'Discord', labelAliases: [], directus: { prefix: 'discord', equals: ['discord'], contains: [] }, contactMethod: 'Discord' },
  { label: 'Teams', labelAliases: [], directus: { prefix: 'teams', equals: ['teams'], contains: [] }, contactMethod: 'Teams' },
  { label: 'Email', labelAliases: [], directus: 'email', contactMethod: 'Email' },
  { label: 'Site', labelAliases: [], directus: 'email', contactMethod: null },
  { label: 'Jivo', labelAliases: [], directus: { prefix: 'jivo', equals: ['jivo'], contains: [] }, contactMethod: null },
]

export const MESSENGER_LABELS = MESSENGERS.map((messenger) => messenger.label)

export const CONTACT_METHODS = MESSENGERS
  .map((messenger) => messenger.contactMethod)
  .filter((method): method is ContactMethodKey => Boolean(method))

/** Operator short codes become the full label; any other text keeps its own spelling. */
export const normalizeMessengerLabel = (value: string) => {
  const trimmed = String(value || '').trim()
  const lowered = trimmed.toLowerCase()
  if (!lowered) return ''
  return MESSENGERS.find((messenger) => messenger.labelAliases.includes(lowered))?.label || trimmed
}

export const toDirectusMessenger = (messenger: string, login: string, userEmail = '') => {
  const base = String(messenger || '').trim().toLowerCase()
  const username = String(login || '').trim()
  const email = String(userEmail || '').trim()
  if (!base) return ''
  const writesEmail = MESSENGERS.some((item) => item.directus === 'email' && base.includes(item.label.toLowerCase()))
  if (writesEmail) return email ? `email: ${email}` : ''
  if (!username) return ''
  const match = MESSENGERS.find((item) => item.directus !== 'email' && (
    item.directus.equals.includes(base) || item.directus.contains.some((part) => base.includes(part))
  ))
  const prefix = match && match.directus !== 'email' ? match.directus.prefix : base
  return `${prefix}: ${username}`
}

/** Player-card contact type for a messenger label or short code; null when there is none. */
export const contactMethodForMessenger = (messenger: string): ContactMethodKey | null => {
  const label = normalizeMessengerLabel(messenger).toLowerCase()
  return MESSENGERS.find((item) => item.label.toLowerCase() === label)?.contactMethod ?? null
}
