import { useEffect, useState } from 'react'
import { Download, Search, UserPlus, ChevronRight, Users, X } from 'lucide-react'

// Views
import SearchPlayerView from './components/SearchPlayerView'
import AddPlayerView from './components/AddPlayerView'
import FormView from './components/FormView'
import PlayerListView from './components/PlayerListView'
import EditPlayerView from './components/EditPlayerView'

export type ViewState = 'search' | 'add' | 'form' | 'list' | 'edit'
export type OperationType = 'Deposit' | 'Withdrawal'

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('search')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [operationType, setOperationType] = useState<OperationType>('Deposit')
  const [editingPlayer, setEditingPlayer] = useState<PlayerPayload | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)

  useEffect(() => {
    let active = true

    window.electronAPI.getAppInfo()
      .then((result) => {
        if (active) {
          setAppInfo(result)
        }
      })
      .catch(() => {
        // Version display is informational; failures should not block the app.
      })

    window.electronAPI.checkForUpdates()
      .then((result) => {
        if (active && result.available) {
          setUpdateInfo(result)
        }
      })
      .catch(() => {
        // Update checks are best-effort and should never block daily work.
      })

    return () => {
      active = false
    }
  }, [])

  const normalizeAccount = (account: Account): Account => ({
    ...account,
    roomName: account.roomName ?? account.room_name,
    roomUsername: account.roomUsername ?? account.room_username ?? '',
    roomPlayerId: account.roomPlayerId ?? account.room_player_id ?? '',
    email: account.email ?? ''
  })

  const normalizeContact = (contact: PlayerContact): PlayerContact => ({
    ...contact,
    contactMethod: contact.contactMethod ?? contact.contact_method ?? 'TG',
    contactValue: contact.contactValue ?? contact.contact_value ?? '',
    isPrimary: Boolean(contact.isPrimary ?? contact.is_primary)
  })

  const handlePlayerFound = (playerData: PlayerPayload) => {
    const accounts = (playerData.accounts || []).map(normalizeAccount)
    const contacts = (playerData.contacts || playerData.player?.contacts || []).map(normalizeContact)
    const flat = { ...playerData.player, accounts, contacts }
    setSelectedPlayer(flat)
    setSelectedAccount(accounts[0] || null)
    setCurrentView('form')
  }

  const handlePlayerUpdate = (updates: Partial<Player>) => {
    setSelectedPlayer((current) => current ? { ...current, ...updates } : current)
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-20 lg:w-64 flex flex-col bg-slate-800/50 backdrop-blur-md border-r border-slate-700/50 transition-all duration-300">
        <div className="p-4 lg:p-6 mb-8 flex items-center justify-center lg:justify-start gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('search')}
            className="rounded-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            title="На главный экран"
          >
            <img
              src="/icon.png"
              alt=""
              className="h-12 w-12 rounded-xl object-cover shadow-lg shadow-blue-500/20"
            />
          </button>
          <h1 className="hidden lg:block font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Transactioner
          </h1>
        </div>

        <div className="flex-1 flex flex-col gap-2 px-3">
          <NavItem 
            icon={<Search size={20} />} 
            label="Поиск игрока" 
            active={currentView === 'search' || currentView === 'form'} 
            onClick={() => setCurrentView('search')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Все игроки" 
            active={currentView === 'list'} 
            onClick={() => setCurrentView('list')} 
          />
          <NavItem 
            icon={<UserPlus size={20} />} 
            label="Добавить игрока" 
            active={currentView === 'add'} 
            onClick={() => setCurrentView('add')} 
          />
        </div>

        {appInfo?.version && (
          <div className="px-4 pb-4 text-center text-xs text-slate-600 lg:text-left">
            <span className="hidden lg:inline">Версия </span>
            v{appInfo.version}
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
        {/* Background Decorative Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

        <div className="min-w-0 flex-1 p-8 lg:p-12 z-10">
          {updateInfo?.releaseUrl && !updateDismissed && (
            <div className="mx-auto mb-6 flex max-w-4xl items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100 shadow-lg shadow-blue-950/20">
              <Download size={18} className="shrink-0 text-blue-300" />
              <div className="min-w-0 flex-1">
                Доступна новая версия {updateInfo.latestVersion}
              </div>
              <button
                type="button"
                onClick={() => window.electronAPI.openExternalUrl(updateInfo.releaseUrl!)}
                className="rounded-lg bg-blue-500 px-3 py-2 font-medium text-white transition-colors hover:bg-blue-400"
              >
                Скачать
              </button>
              <button
                type="button"
                onClick={() => setUpdateDismissed(true)}
                className="rounded-lg p-2 text-blue-200 transition-colors hover:bg-blue-400/10 hover:text-white"
                title="Скрыть"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {currentView === 'search' && (
            <SearchPlayerView onFound={handlePlayerFound} />
          )}
          {currentView === 'list' && (
            <PlayerListView
              onSelect={handlePlayerFound}
              onEdit={(data) => { setEditingPlayer(data); setCurrentView('edit') }}
            />
          )}
          {currentView === 'edit' && editingPlayer && (
            <EditPlayerView
              playerData={editingPlayer}
              onSuccess={(p) => handlePlayerFound(p)}
              onDeleted={() => setCurrentView('list')}
            />
          )}
          {currentView === 'add' && (
            <AddPlayerView onSuccess={(p) => handlePlayerFound(p)} />
          )}
          {currentView === 'form' && selectedPlayer && (
            <FormView
              key={`${selectedPlayer.id || selectedPlayer.messenger_username}`}
              player={selectedPlayer} 
              account={selectedAccount}
              onAccountSelect={setSelectedAccount}
              operationType={operationType}
              onOperationChange={setOperationType}
              onPlayerUpdate={handlePlayerUpdate}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group
        ${active 
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}
      `}
    >
      <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
        {icon}
      </div>
      <span className="hidden lg:block font-medium">{label}</span>
      {active && <ChevronRight size={16} className="hidden lg:block ml-auto opacity-50" />}
    </button>
  )
}

export default App
