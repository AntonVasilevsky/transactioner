import { matchesRoomSearch } from '../../utils/roomSearch'
import type { FieldOption } from './DropdownPanel'

export const toFieldOptions = (values: readonly string[]): FieldOption[] => values.map((value) => ({ value, label: value }))

/** Room search: part of a word, transliteration, Russian keyboard layout, room key or network. */
export const matchesRoomOption = (option: FieldOption, query: string) => matchesRoomSearch([option.label, ...(option.searchText || [])], query)

export const roomProfileOptions = (profiles: RoomProfileInfo[]): FieldOption[] => profiles.map((profile) => ({
  value: profile.room_key,
  label: profile.display_name,
  description: profile.network_name || undefined,
  searchText: [profile.room_key, profile.network_name || ''],
}))

export const CONTACT_METHOD_OPTIONS = toFieldOptions(['TG', 'WA', 'Discord', 'Teams', 'Email'])
