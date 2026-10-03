import type { LinkVerificationFieldKey, LinkVerificationRoomRule, LinkVerificationTemplate } from './linkVerificationRules'
import { CORE_ROOM_NAMES, sortRoomNamesByUsage, type RoomRegistrationStatLike } from './roomUsageSort'

export type { RoomRegistrationStatLike } from './roomUsageSort'

export const CORE_LINK_VERIFICATION_ROOMS = CORE_ROOM_NAMES

export const normalizeMessengerLabel = (value: string) => {
  const lowered = value.trim().toLowerCase()
  if (!lowered) return ''
  if (lowered === 'tg') return 'Telegram'
  if (lowered === 'wa') return 'WA'
  return value.trim() || 'Telegram'
}

export const toDirectusMessenger = (messenger: string, login: string, userEmail = '') => {
  const base = messenger.trim().toLowerCase()
  const username = login.trim()
  const email = userEmail.trim()
  if (!base) return ''
  if (base.includes('email') || base.includes('site')) {
    return email ? `email: ${email}` : ''
  }
  if (!username) return ''
  const prefix = base.includes('telegram')
    ? 'telegram'
    : base === 'wa' || base.includes('whatsapp')
      ? 'whatsapp'
      : base || 'messenger'
  return `${prefix}: ${username}`
}

export const resolveSheet2DirectusMessenger = (values: {
  source: string
  messenger: string
  login: string
  email: string
}) => {
  const messenger = values.source.trim().toLowerCase() === 'site'
    ? values.source
    : values.messenger
  return toDirectusMessenger(messenger, values.login, values.email)
}

export interface LinkVerificationTemplateOverrideLike {
  room_name: string
  template_key: string
  label: string
  channel: 'messenger' | 'email'
  body: string
  recipient_email?: string | null
  cc_emails?: string | null
  notes?: string | null
}

export const applyLinkVerificationTemplateOverrides = (
  templates: LinkVerificationTemplate[],
  overrides: LinkVerificationTemplateOverrideLike[],
  roomName: string
) => {
  const normalizedRoomName = roomName.trim().toLowerCase()
  return templates.map((template) => {
    const saved = overrides.find((item) => (
      item.room_name.trim().toLowerCase() === normalizedRoomName &&
      item.template_key === template.key
    ))
    if (!saved) return template
    return {
      ...template,
      label: saved.label,
      channel: saved.channel,
      body: saved.body,
      recipientEmail: saved.recipient_email || undefined,
      ccEmails: saved.cc_emails
        ? saved.cc_emails.split(',').map((item) => item.trim()).filter(Boolean)
        : template.ccEmails,
      notes: saved.notes || template.notes,
    } satisfies LinkVerificationTemplate
  })
}

export const uniqueNonEmpty = (values: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const rawValue of values) {
    const value = rawValue.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

export const sortLinkVerificationRoomOptions = (
  roomNames: string[],
  stats: RoomRegistrationStatLike[]
) => sortRoomNamesByUsage([...CORE_LINK_VERIFICATION_ROOMS, ...roomNames], stats)

/**
 * Position of each field in the request form: the first form field (Username/Nick/Login/User ID),
 * then Room ID, then Email. A room rule decides which fields appear, never their order.
 */
const FORM_FIELD_ORDER: Record<LinkVerificationFieldKey, number> = {
  username: 0,
  nick: 0,
  userId: 0,
  messengerUsername: 0,
  roomId: 1,
  email: 2
}

export const composePlayerDataByRule = (
  requiredFields: LinkVerificationFieldKey[],
  fieldValues: Record<LinkVerificationFieldKey, string>
) => {
  const orderedFields = [...requiredFields].sort((left, right) => FORM_FIELD_ORDER[left] - FORM_FIELD_ORDER[right])
  return uniqueNonEmpty(orderedFields.map((key) => fieldValues[key] || '')).join(' / ')
}

export const composeTypedIdentityData = (values: {
  username: string
  roomId: string
  email: string
}) => uniqueNonEmpty([
  values.username.trim(),
  values.roomId.trim(),
  values.email.trim()
]).join(' / ')

export const buildLinkVerificationFieldValues = (values: {
  username: string
  roomId: string
  email: string
}): Record<LinkVerificationFieldKey, string> => {
  const username = values.username.trim()
  return {
    username,
    nick: username,
    roomId: values.roomId.trim(),
    email: values.email.trim(),
    userId: username,
    messengerUsername: username
  }
}

export const preserveIdentityFieldsForRoomRule = (
  values: { username: string; roomId: string; email: string },
  rule: Pick<LinkVerificationRoomRule, 'requiredFields' | 'sheet2RoomUsernameField'>
) => {
  const nextValues = {
    username: values.username,
    roomId: values.roomId,
    email: values.email,
  }
  const username = values.username.trim()
  const roomId = values.roomId.trim()
  const needsUsername = rule.requiredFields.some((field) => (
    field === 'username' || field === 'nick' || field === 'userId'
  )) || rule.sheet2RoomUsernameField === 'username' || rule.sheet2RoomUsernameField === 'nick' || rule.sheet2RoomUsernameField === 'userId'
  const needsRoomId = rule.requiredFields.includes('roomId') || rule.sheet2RoomUsernameField === 'roomId'

  if (needsUsername && !username && roomId) nextValues.username = roomId
  if (needsRoomId && !roomId && username) nextValues.roomId = username

  return nextValues
}

export const resolveIdentityFieldsForRoomChange = (
  values: { username: string; roomId: string; email: string },
  rule: Pick<LinkVerificationRoomRule, 'requiredFields' | 'sheet2RoomUsernameField'>,
  preserveData: boolean
) => (
  preserveData
    ? preserveIdentityFieldsForRoomRule(values, rule)
    : { username: '', roomId: '', email: '' }
)

export const buildLinkVerificationTemplateValues = (values: {
  roomName: string
  playerData: string
  messenger: string
  messengerUsername: string
  username: string
  roomId: string
  email: string
}) => {
  const username = values.username.trim()
  const roomId = values.roomId.trim()
  const messengerUsername = values.messengerUsername.trim()
  return {
    room_name: values.roomName,
    player_data: values.playerData.trim(),
    messenger: normalizeMessengerLabel(values.messenger),
    messenger_username: messengerUsername,
    messenger_usermane: messengerUsername,
    username,
    nick: username,
    id: roomId,
    room_id: roomId,
    email: values.email.trim(),
    login: username,
    user_id: username
  }
}

const normalizeRequestLabelRoom = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')

export const getLinkVerificationUsernameFieldLabel = (roomName: string, templateKey = '') => {
  const normalizedRoom = normalizeRequestLabelRoom(roomName)
  if (normalizedRoom === 'redstar') return 'Login'
  if (templateKey === '888-confirmation') return 'gir1_'
  if (normalizedRoom === 'partypoker' || normalizedRoom === 'bwin') return 'User ID'
  if (
    normalizedRoom === 'nexa' ||
    normalizedRoom === 'nexapoker' ||
    normalizedRoom === 'wptg' ||
    normalizedRoom === 'wptglobal' ||
    normalizedRoom === 'tonpoker' ||
    normalizedRoom === 'gutspoker'
  ) {
    return 'Nick'
  }
  return 'Username'
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const replaceTemplateValue = (input: string, key: string, value: string) =>
  input.replace(new RegExp(escapeRegExp(`<${key}>`), 'gi'), value)

export const buildLinkVerificationRequestText = (
  templateBody: string,
  values: Record<string, string>
) => {
  let result = templateBody
  for (const [key, value] of Object.entries(values)) {
    result = replaceTemplateValue(result, key, value)
  }
  return result
}

export const googleSheetsTsvCell = (value: string) => String(value || '')
  .trim()
  .replace(/\r\n|\r/g, '\n')
  .replace(/[ \f\v]+/g, ' ')
  .replace(/"/g, '""')
  .replace(/^([\s\S]*[\t\n"][\s\S]*)$/, '"$1"')

export const buildSheet1Tsv = (values: {
  date: string
  manager: string
  messenger: string
  messengerUsername: string
  roomName: string
  loginNickId: string
  status: string
  deliveredToPlayer: string
  updateChat: boolean
}) => [
  values.date,
  values.manager,
  normalizeMessengerLabel(values.messenger),
  values.messengerUsername,
  values.roomName,
  values.loginNickId,
  values.status || 'Check',
  values.deliveredToPlayer,
  values.updateChat ? 'TRUE' : 'FALSE'
].map(googleSheetsTsvCell).join('\t')

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export const buildCenteredGoogleSheetsRowHtml = (tsv: string) => {
  const cells = tsv.split('\t').map((value) => (
    `<td align="center" valign="middle" style="text-align:center;vertical-align:middle;white-space:pre-wrap;">${escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>')}</td>`
  ))
  return `<table><tbody><tr valign="middle" style="vertical-align:middle;">${cells.join('')}</tr></tbody></table>`
}
