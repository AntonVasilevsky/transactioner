import { useEffect, useRef, useState } from 'react'
import { Search, Loader2, UserRound, UserPlus } from 'lucide-react'
import { toPlayerSearchResults } from '../utils/playerSearchResults'

const METHOD_COLORS: Record<string, string> = {
  TG: 'bg-blue-500/20 text-blue-400',
  WA: 'bg-emerald-500/20 text-emerald-400',
  Discord: 'bg-indigo-500/20 text-indigo-400',
  Teams: 'bg-violet-500/20 text-violet-400',
  Email: 'bg-amber-500/20 text-amber-400',
}

export default function SearchPlayerView({
  onFound,
  onCreate,
}: {
  onFound: (player: PlayerPayload) => void
  onCreate: (initialContact: string) => void
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<PlayerPayload[]>([])
  const [notFoundQuery, setNotFoundQuery] = useState('')
  const liveSearchRunRef = useRef(0)

  const handleQueryChange = (value: string) => {
    liveSearchRunRef.current += 1
    setQuery(value)
    setNotFoundQuery('')
    if (!value.trim()) {
      setResults([])
      setError('')
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    const runId = liveSearchRunRef.current + 1
    liveSearchRunRef.current = runId

    setLoading(true)
    setError('')
    setResults([])
    setNotFoundQuery('')
    try {
      const result = await window.electronAPI.searchPlayer(trimmedQuery)
      if (liveSearchRunRef.current !== runId) return
      if (Array.isArray(result)) {
        setResults(toPlayerSearchResults(result))
        if (result.length === 0) setNotFoundQuery(trimmedQuery)
      } else if (result) {
        onFound(result)
      } else {
        setNotFoundQuery(trimmedQuery)
      }
    } catch (err: unknown) {
      if (liveSearchRunRef.current !== runId) return
      setError('Ошибка поиска: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      if (liveSearchRunRef.current === runId) setLoading(false)
    }
  }

  useEffect(() => {
    const trimmedQuery = query.trim()
    const runId = liveSearchRunRef.current + 1
    liveSearchRunRef.current = runId

    if (!trimmedQuery) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled || liveSearchRunRef.current !== runId) return
      setLoading(true)
      setError('')
      setNotFoundQuery('')
      window.electronAPI.searchPlayer(trimmedQuery)
        .then((result) => {
          if (cancelled || liveSearchRunRef.current !== runId) return

          if (Array.isArray(result)) {
            setResults(toPlayerSearchResults(result))
            if (result.length === 0) setNotFoundQuery(trimmedQuery)
            return
          }

          if (result) {
            setResults(toPlayerSearchResults(result))
            return
          }

          setResults([])
          setNotFoundQuery(trimmedQuery)
        })
        .catch((err: unknown) => {
          if (cancelled || liveSearchRunRef.current !== runId) return
          setResults([])
          setError('Ошибка поиска: ' + (err instanceof Error ? err.message : String(err)))
        })
        .finally(() => {
          if (!cancelled && liveSearchRunRef.current === runId) {
            setLoading(false)
          }
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="max-w-2xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Найти игрока
        </h2>
        <p className="text-slate-400 text-lg">
          Введите юзернейм, номер, ник в руме или часть контакта
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
        <div className="relative flex items-center bg-slate-800 border border-slate-700/50 rounded-2xl p-2 shadow-2xl">
          <div className="pl-4 pr-2 text-slate-400">
            <Search size={24} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="@username, Anton или номер"
            className="flex-1 bg-transparent border-none outline-none text-xl text-slate-100 placeholder-slate-700 py-4 px-2"
            autoFocus
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-8 py-4 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Поиск'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {!error && notFoundQuery && !loading && results.length === 0 && (
        <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-left shadow-lg shadow-emerald-950/10 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <UserPlus size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-100">Игрок не найден</div>
              <div className="mt-1 break-words text-sm text-slate-400">
                Можно создать нового игрока с контактом <span className="text-slate-200">{notFoundQuery}</span>.
              </div>
            </div>
            <button
              type="button"
              onClick={() => onCreate(notFoundQuery)}
              className="shrink-0 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              Создать
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="text-sm text-slate-400 px-1">Найдено игроков: {results.length}</div>
          {results.map((item) => (
            <button
              key={item.player.id}
              type="button"
              onClick={() => onFound(item)}
              className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-blue-500/30 rounded-xl px-5 py-4 text-left transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400">
                <UserRound size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${METHOD_COLORS[item.player.contact_method] || 'bg-slate-700 text-slate-400'}`}>
                    {item.player.contact_method}
                  </span>
                  <span className="font-medium text-slate-100 truncate">{item.player.messenger_username}</span>
                </div>
                <div className="text-sm text-slate-500 mt-1 truncate">
                  {(item.contacts || []).map((contact) => `${contact.contact_method}: ${contact.contact_value}`).join(' · ') || `Румов: ${item.accounts?.length || 0}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
