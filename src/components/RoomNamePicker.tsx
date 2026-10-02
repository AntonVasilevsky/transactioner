import { useMemo } from 'react'
import ComboboxField from './fields/ComboboxField'
import { matchesRoomOption, toFieldOptions } from './fields/fieldOptions'

interface RoomNamePickerProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  focusBorderClass?: string
  autoFocus?: boolean
}

export default function RoomNamePicker({
  value,
  options,
  onChange,
  focusBorderClass = 'focus:border-blue-500',
  autoFocus = false,
}: RoomNamePickerProps) {
  const fieldOptions = useMemo(
    () => toFieldOptions(Array.from(new Set(options.map(option => option.trim()).filter(Boolean)))),
    [options]
  )

  return (
    <ComboboxField
      value={value}
      options={fieldOptions}
      onSelect={(nextValue) => onChange(nextValue)}
      matches={matchesRoomOption}
      allowCustomValue
      placeholder="Найти рум"
      emptyText="Румы не найдены"
      autoFocus={autoFocus}
      inputClassName={`rounded-lg py-2.5 ${focusBorderClass}`}
    />
  )
}
