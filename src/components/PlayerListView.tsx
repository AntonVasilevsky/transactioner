import { useState, useEffect } from 'react'
import { Users, Clock, Search, Pencil, Database } from 'lucide-react'
import { contactSearchKey } from '../utils/contactNormalization'

const METHOD_COLORS: Record<string, string> = {
  TG: 'bg-blue-500/20 text-blue-400',
  WA: 'bg-emerald-500/20 text-emerald-400',
  Discord: 'bg-indigo-500/20 text-indigo-400',
  Teams: 'bg-violet-500/20 text-violet-400',
  Email: 'bg-amber-500/20 text-amber-400',
}

export default function PlayerListView({ onSelect, onEdit }: { onSelect: (player: PlayerPayload) => void, onEdit: (playerData: PlayerPayload) => void }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [storageLoading, setStorageLoading] = useState(true)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    window.electronAPI.getAllPlayers().then(data => {
      setPlayers(data || [])
      setLoading(false)
    })
    window.electronAPI.getStorageInfo()
      .then((info) => {
        setStorageInfo(info)
        setStorageError(false)
      })
      .catch(() => {
        setStorageInfo(null)
        setStorageError(true)
      })
      .finally(() => setStorageLoading(false))
  }, [])

  const filtered = players.filter(p => {
    const haystack = contactSearchKey(`${p.messenger_username || ''} ${p.contact_summary || ''} ${p.room_summary || ''}`)
    return haystack.includes(contactSearchKey(filter))
  })

  const handleSelect = async (p: Player) => {
    if (!p.id) return
    // Загружаем полные данные с аккаунтами
    const full = await window.electronAPI.getPlayerById(p.id)
    if (full) onSelect(full)
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center gap-3">
        <Users size={28} className="text-violet-400" />
        <h2 className="text-2xl font-bold text-slate-100">Список игроков</h2>
        <span className="ml-auto text-sm text-slate-500">{players.length} всего</span>
      </div>

      {/* Filter */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Фильтр по юзернейму..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-slate-100 placeholder-slate-700 outline-none focus:border-violet-500"
        />
      </div>

      {loading ? (
        <div className="text-slate-500 text-center py-12">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-center py-12">Нет игроков</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <button
                onClick={() => handleSelect(p)}
                className="flex-1 flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-violet-500/30 rounded-xl px-5 py-4 text-left transition-all group"
              >
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${METHOD_COLORS[p.contact_method] || 'bg-slate-700 text-slate-400'}`}>
                  {p.contact_method}
                </span>
                <span className="flex-1 font-medium text-slate-200 group-hover:text-white">
                  {p.messenger_username}
                </span>
                {Boolean(p.last_used_at && p.last_used_at > 0) && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={12} />
                    {new Date(p.last_used_at || 0).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </button>
              <button
                onClick={async () => {
                  if (!p.id) return
                  const data = await window.electronAPI.getPlayerById(p.id)
                  if (data) onEdit(data)
                }}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-500 hover:text-violet-400 transition-all"
                title="Редактировать"
              >
                <Pencil size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-700/70 bg-slate-800/70 p-4 text-xs leading-5 shadow-lg shadow-slate-950/20">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Database size={16} className="text-blue-400" />
          Файлы данных
        </div>
        {storageLoading ? (
          <div className="text-slate-400">Загрузка путей...</div>
        ) : storageError || !storageInfo ? (
          <div className="text-rose-300">Не удалось получить адреса файлов данных.</div>
        ) : (
          <div className="space-y-3">
            <StoragePath label="БД" value={storageInfo.databasePath} />
            <StoragePath label="Бекап" value={storageInfo.latestBackupPath} />
            <StoragePath label="Папка бекапов" value={storageInfo.backupDir} />
          </div>
        )}
      </div>
    </div>
  )
}

function StoragePath({ label, value }: { label: string, value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 font-semibold text-slate-300">{label}</div>
      <div className="select-all break-all rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-slate-300">
        {value}
      </div>
    </div>
  )
}
