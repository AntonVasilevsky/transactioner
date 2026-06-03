import type { LinkVerificationFieldKey } from './linkVerificationRules'

export interface RoomRegistrationStatLike {
  roomName?: string | null
  room_name?: string | null
  registrationCount?: number | null
  registration_count?: number | null
}

export const CORE_LINK_VERIFICATION_ROOMS = ['Nexa', 'Champion Poker', 'RedStar']

const normalizeRoomFrequencyKey = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')

export const normalizeMessengerLabel = (value: string) => {
  const lowered = value.trim().toLowerCase()
  if (!lowered) return ''
  if (lowered === 'tg') return 'Telegram'
  if (lowered === 'wa') return 'WA'
  return value.trim() || 'Telegram'
}

export const toDirectusMessenger = (messenger: string, login: string) => {
  const base = messenger.trim().toLowerCase()
  const username = login.trim()
  if (!base || !username) return ''
  const prefix = base.includes('telegram')
    ? 'telegram'
    : base === 'wa' || base.includes('whatsapp')
      ? 'whatsapp'
      : base.includes('site')
        ? 'site'
        : base || 'messenger'
  return `${prefix}: ${username}`
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

export const buildRoomRegistrationFrequencyMap = (stats: RoomRegistrationStatLike[]) => {
  const result = new Map<string, number>()
  for (const stat of stats) {
    const roomName = (stat.roomName ?? stat.room_name ?? '').trim()
    const key = normalizeRoomFrequencyKey(roomName)
    if (!key) continue
    const count = Number(stat.registrationCount ?? stat.registration_count ?? 0) || 0
    result.set(key, (result.get(key) || 0) + count)
  }
  return result
}

export const sortLinkVerificationRoomOptions = (
  roomNames: string[],
  stats: RoomRegistrationStatLike[]
) => {
  const names = new Map<string, string>()
  for (const name of [...CORE_LINK_VERIFICATION_ROOMS, ...roomNames]) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const key = normalizeRoomFrequencyKey(trimmed)
    if (!names.has(key)) names.set(key, trimmed)
  }

  const frequencies = buildRoomRegistrationFrequencyMap(stats)
  const coreKeys = new Map(CORE_LINK_VERIFICATION_ROOMS.map((name, index) => [
    normalizeRoomFrequencyKey(name),
    index
  ]))

  return Array.from(names.values()).sort((left, right) => {
    const leftKey = normalizeRoomFrequencyKey(left)
    const rightKey = normalizeRoomFrequencyKey(right)
    const leftCoreIndex = coreKeys.get(leftKey)
    const rightCoreIndex = coreKeys.get(rightKey)

    if (leftCoreIndex !== undefined || rightCoreIndex !== undefined) {
      if (leftCoreIndex === undefined) return 1
      if (rightCoreIndex === undefined) return -1
      return leftCoreIndex - rightCoreIndex
    }

    const countDiff = (frequencies.get(rightKey) || 0) - (frequencies.get(leftKey) || 0)
    if (countDiff !== 0) return countDiff
    return left.localeCompare(right, undefined, { sensitivity: 'base' })
  })
}

export const composePlayerDataByRule = (
  requiredFields: LinkVerificationFieldKey[],
  fieldValues: Record<LinkVerificationFieldKey, string>
) => {
  return uniqueNonEmpty(requiredFields.map((key) => fieldValues[key] || '')).join(' / ')
}

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
  values.date.trim(),
  values.manager.trim(),
  normalizeMessengerLabel(values.messenger),
  values.messengerUsername.trim(),
  values.roomName.trim(),
  values.loginNickId.trim(),
  values.status.trim() || 'Check',
  values.deliveredToPlayer.trim(),
  values.updateChat ? 'TRUE' : 'FALSE'
].join('\t')

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export const buildCenteredGoogleSheetsRowHtml = (tsv: string) => {
  const cells = tsv.split('\t').map((value) => (
    `<td style="text-align:center;vertical-align:middle;white-space:pre-wrap;">${escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>')}</td>`
  ))
  return `<table><tbody><tr>${cells.join('')}</tr></tbody></table>`
}
