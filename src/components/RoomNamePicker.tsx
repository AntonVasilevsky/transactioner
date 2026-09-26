import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { matchesRoomSearch } from '../utils/roomSearch'

interface RoomNamePickerProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  focusBorderClass?: string
}

export default function RoomNamePicker({
  value,
  options,
  onChange,
  focusBorderClass = 'focus:border-blue-500',
}: RoomNamePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim()
    const uniqueOptions = Array.from(new Set(options.map(option => option.trim()).filter(Boolean)))
    return query
      ? uniqueOptions.filter(option => matchesRoomSearch([option], query))
      : uniqueOptions
  }, [options, searchQuery])

  const selectRoom = (roomName: string) => {
    onChange(roomName)
    setSearchQuery('')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setSearchQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={(event) => {
          event.target.select()
          setSearchQuery('')
          setIsOpen(true)
        }}
        onClick={(event) => {
          event.currentTarget.select()
          setSearchQuery('')
          setIsOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setSearchQuery('')
            setIsOpen(false)
          }, 120)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && filteredOptions[0]) {
            event.preventDefault()
            selectRoom(filteredOptions[0])
          }
          if (event.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        placeholder="Найти рум"
        className={`w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-slate-100 outline-none ${focusBorderClass}`}
      />
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-slate-950/40">
          {filteredOptions.length ? (
            filteredOptions.map(option => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectRoom(option)}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  option === value
                    ? 'bg-blue-600/20 text-blue-200'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="font-semibold">{option}</div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-slate-500">Румы не найдены</div>
          )}
        </div>
      )}
    </div>
  )
}
