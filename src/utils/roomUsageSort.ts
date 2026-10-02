// One ordering rule for every room list in the app: core rooms first, then rooms
// with more player accounts, then alphabetically.

export interface RoomRegistrationStatLike {
  roomName?: string | null
  room_name?: string | null
  registrationCount?: number | null
  registration_count?: number | null
}

export const CORE_ROOM_NAMES = ['Nexa', 'Champion Poker', 'RedStar']

export const normalizeRoomUsageKey = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')

export const buildRoomUsageMap = (stats: RoomRegistrationStatLike[]) => {
  const result = new Map<string, number>()
  for (const stat of stats) {
    const roomName = (stat.roomName ?? stat.room_name ?? '').trim()
    const key = normalizeRoomUsageKey(roomName)
    if (!key) continue
    const count = Number(stat.registrationCount ?? stat.registration_count ?? 0) || 0
    result.set(key, (result.get(key) || 0) + count)
  }
  return result
}

const coreRoomRanks = new Map(CORE_ROOM_NAMES.map((name, index) => [normalizeRoomUsageKey(name), index]))

/**
 * Sorts any room items. `namesOf` returns every name the room is known by
 * (display name, room key); the first one is used for the alphabetical order.
 */
export const sortByRoomUsage = <T>(
  items: T[],
  namesOf: (item: T) => Array<string | null | undefined>,
  stats: RoomRegistrationStatLike[]
): T[] => {
  const usage = buildRoomUsageMap(stats)
  const ranked = items.map((item) => {
    const names = namesOf(item).map((name) => String(name || '').trim()).filter(Boolean)
    const keys = Array.from(new Set(names.map(normalizeRoomUsageKey).filter(Boolean)))
    const coreRanks = keys.map((key) => coreRoomRanks.get(key)).filter((rank): rank is number => rank !== undefined)
    return {
      item,
      label: names[0] || '',
      coreRank: coreRanks.length ? Math.min(...coreRanks) : Number.POSITIVE_INFINITY,
      count: Math.max(0, ...keys.map((key) => usage.get(key) || 0)),
    }
  })

  return ranked.sort((left, right) => {
    if (left.coreRank !== right.coreRank) return left.coreRank - right.coreRank
    if (left.count !== right.count) return right.count - left.count
    return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
  }).map(({ item }) => item)
}

export const sortRoomNamesByUsage = (names: string[], stats: RoomRegistrationStatLike[]) => {
  const unique = new Map<string, string>()
  for (const name of names) {
    const trimmed = name.trim()
    const key = normalizeRoomUsageKey(trimmed) || trimmed.toLowerCase()
    if (trimmed && !unique.has(key)) unique.set(key, trimmed)
  }
  return sortByRoomUsage(Array.from(unique.values()), (name) => [name], stats)
}

export const sortRoomProfilesByUsage = <T extends { display_name: string; room_key: string }>(
  profiles: T[],
  stats: RoomRegistrationStatLike[]
) => sortByRoomUsage(profiles, (profile) => [profile.display_name, profile.room_key], stats)
