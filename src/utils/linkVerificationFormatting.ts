import type { LinkVerificationFieldKey, LinkVerificationRoomRule, LinkVerificationTemplate } from './linkVerificationRules'
import { CORE_ROOM_NAMES, sortRoomNamesByUsage, type RoomRegistrationStatLike } from './roomUsageSort'

import { contactMethodForMessenger, normalizeMessengerLabel, toDirectusMessenger } from './messengers'
import { contactSearchKey } from './contactNormalization'

export type { RoomRegistrationStatLike } from './roomUsageSort'
export { normalizeMessengerLabel, toDirectusMessenger } from './messengers'

export const CORE_LINK_VERIFICATION_ROOMS = CORE_ROOM_NAMES

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

/** The first form field has the same label in every room; templates may still call it login or user id. */
export const LINK_VERIFICATION_USERNAME_FIELD_LABEL = 'Nick'

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

export type LinkVerificationPlayerSavePlan =
  | { input: SaveLinkVerificationPlayerInput, skipReason?: undefined }
  | { input?: undefined, skipReason: string }

/** What the request copy saves to the player cards, or why it saves nothing. */
export const planLinkVerificationPlayerSave = (values: {
  rule: Pick<LinkVerificationRoomRule, 'canonicalRoomName' | 'persistPlayerInMainDb' | 'accountRoomName'>
  messenger: string
  contact: string
  username: string
  roomId: string
  email: string
}): LinkVerificationPlayerSavePlan | null => {
  if (!values.rule.persistPlayerInMainDb) return null
  const contact = values.contact.trim()
  const username = values.username.trim()
  const roomId = values.roomId.trim()
  if (!contact) return { skipReason: 'Игрок не сохранён: заполните «Контакт».' }
  const contactMethod = contactMethodForMessenger(values.messenger)
  if (!contactMethod) {
    const label = normalizeMessengerLabel(values.messenger)
    return {
      skipReason: label
        ? `Игрок не сохранён: в карточке игрока нет контакта типа «${label}».`
        : 'Игрок не сохранён: выберите мессенджер.'
    }
  }
  if (!username && !roomId) return { skipReason: 'Игрок не сохранён: заполните Nick или Room ID.' }
  return {
    input: {
      contact_method: contactMethod,
      contact_value: contact,
      room_name: values.rule.accountRoomName || values.rule.canonicalRoomName,
      room_username: username || null,
      room_player_id: roomId || null,
      email: values.email.trim() || null,
    }
  }
}

export const describeLinkVerificationPlayerSave = (
  result: SaveLinkVerificationPlayerResult,
  input: SaveLinkVerificationPlayerInput
) => {
  // The template is copied before the save runs, whatever the save says.
  const copied = 'Скопировано. '
  if (!result.success) return `${copied}Игрок не сохранён: ${result.error || 'ошибка базы данных'}.`
  const who = input.contact_value
  const room = input.room_name
  if (result.status === 'created') return `${copied}Игрок ${who} создан с аккаунтом ${room}.`
  if (result.status === 'account_added') return `${copied}Игроку ${who} добавлен аккаунт ${room}.`
  if (result.status === 'account_updated') return `${copied}В аккаунте ${room} игрока ${who} дополнены пустые поля.`
  if (result.status === 'similar_found') {
    const names = (result.candidates || []).map((candidate) => {
      const others = candidate.contacts.filter((contact) => contactSearchKey(contact) !== contactSearchKey(candidate.messenger_username))
      return others.length ? `${candidate.messenger_username} (${others.join(', ')})` : candidate.messenger_username
    })
    return `${copied}Игрок не сохранён: похожий игрок уже есть — ${names.join('; ')}. Проверьте и сохраните вручную.`
  }
  return `${copied}Игрок ${who} с аккаунтом ${room} уже есть в базе.`
}

export const describeLinkVerificationPlayerUndo = (
  undo: LinkVerificationPlayerUndo,
  input: SaveLinkVerificationPlayerInput
) => {
  if (undo.kind === 'created') return `Отменено: игрок ${input.contact_value} удалён.`
  if (undo.kind === 'account_added') return `Отменено: аккаунт ${input.room_name} у игрока ${input.contact_value} удалён.`
  return `Отменено: поля аккаунта ${input.room_name} возвращены.`
}
