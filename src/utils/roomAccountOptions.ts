export const legacyPaymentRoomNames = ['RedStar', 'Champion Poker', 'Nexa']

const normalizeRoomIdentity = (value: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9а-яё]+/gi, '')

const legacyPaymentRoomKeys = new Set(legacyPaymentRoomNames.map(normalizeRoomIdentity))

const isActive = (value?: number | boolean) => value !== false && value !== 0

export const roomNameOptionsFromKnowledge = (
  index: RoomKnowledgeIndex | null | undefined,
  currentRoomNames: string[] = []
) => {
  const byKey = new Map<string, string>()
  for (const name of [...legacyPaymentRoomNames, ...currentRoomNames]) {
    const trimmed = String(name || '').trim()
    if (trimmed) byKey.set(normalizeRoomIdentity(trimmed), trimmed)
  }
  for (const profile of index?.profiles || []) {
    if (!isActive(profile.is_active)) continue
    const name = profile.display_name.trim()
    if (name) byKey.set(normalizeRoomIdentity(name), name)
  }
  return Array.from(byKey.values()).sort((left, right) => (
    left.localeCompare(right, undefined, { sensitivity: 'base' })
  ))
}

export const payableRoomKeysForOperation = (
  index: RoomKnowledgeIndex | null | undefined,
  operationType: RoomOperationType
) => new Set(
  (index?.paymentMethods || [])
    .filter(method => method.operation_type === operationType && isActive(method.is_active))
    .map(method => method.room_key)
)

export const accountRoomKeys = (
  account: Account,
  index: RoomKnowledgeIndex | null | undefined
) => {
  const roomName = account.roomName || account.room_name || ''
  const normalizedRoom = normalizeRoomIdentity(roomName)
  return (index?.profiles || [])
    .filter(profile => (
      normalizeRoomIdentity(profile.display_name) === normalizedRoom ||
      normalizeRoomIdentity(profile.room_key) === normalizedRoom
    ))
    .map(profile => profile.room_key)
}

export const isPaymentAccountForOperation = (
  account: Account,
  index: RoomKnowledgeIndex | null | undefined,
  operationType: RoomOperationType
) => {
  const roomName = account.roomName || account.room_name || ''
  if (legacyPaymentRoomKeys.has(normalizeRoomIdentity(roomName))) return true
  if (!index) return true
  const payableKeys = payableRoomKeysForOperation(index, operationType)
  const keys = accountRoomKeys(account, index)
  return keys.some(key => payableKeys.has(key))
}

export const filterPaymentAccountsForOperation = (
  accounts: Account[] = [],
  index: RoomKnowledgeIndex | null | undefined,
  operationType: RoomOperationType
) => accounts.filter(account => isPaymentAccountForOperation(account, index, operationType))
