import { useEffect, useRef, useState } from 'react'
import { Info, Download, Search, UserPlus, ChevronRight, Users, X, Link2 } from 'lucide-react'

// Views
import SearchPlayerView from './components/SearchPlayerView'
import AddPlayerView from './components/AddPlayerView'
import FormView from './components/FormView'
import PlayerListView from './components/PlayerListView'
import EditPlayerView from './components/EditPlayerView'
import RoomInfoView from './components/RoomInfoView'
import LinkVerificationView from './components/LinkVerificationView'
import {
  moveSidebarNavToTarget,
  normalizeSidebarNavOrder,
  type SidebarNavId,
} from './utils/sidebarNavigation'

export type ViewState = 'search' | 'add' | 'form' | 'list' | 'edit' | 'roomInfo' | 'linkVerification'
export type OperationType = 'Deposit' | 'Withdrawal'

const sidebarNavOrderStorageKey = 'transactioner.sidebarNavOrder'

const loadSidebarNavOrder = () => {
  try {
    return normalizeSidebarNavOrder(JSON.parse(localStorage.getItem(sidebarNavOrderStorageKey) || 'null'))
  } catch {
    return normalizeSidebarNavOrder(null)
  }
}

const saveSidebarNavOrder = (order: SidebarNavId[]) => {
  try {
    localStorage.setItem(sidebarNavOrderStorageKey, JSON.stringify(order))
  } catch {
    // Navigation still works when local storage is unavailable; only persistence is lost.
  }
}

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('search')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [operationType, setOperationType] = useState<OperationType>('Deposit')
  const [editingPlayer, setEditingPlayer] = useState<PlayerPayload | null>(null)
  const [addPlayerInitialContact, setAddPlayerInitialContact] = useState('')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNotesInfo | null>(null)
  const [roomInfoHomeSignal, setRoomInfoHomeSignal] = useState(0)
  const [sidebarNavOrder, setSidebarNavOrder] = useState(loadSidebarNavOrder)
  const [draggingNavId, setDraggingNavId] = useState<SidebarNavId | null>(null)
  const [sidebarDropTarget, setSidebarDropTarget] = useState<SidebarNavId | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const draggingNavIdRef = useRef<SidebarNavId | null>(null)
  const suppressNavClickRef = useRef(false)

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

    window.electronAPI.getReleaseNotes()
      .then((result) => {
        if (active && result.shouldShow) {
          setReleaseNotes(result)
        }
      })
      .catch(() => {
        // Release notes are informational and should never block startup.
      })

    return () => {
      active = false
    }
  }, [])

  const scrollMainToTop = () => {
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0 })
    })
  }

  const navigateTo = (view: ViewState) => {
    setCurrentView(view)
    scrollMainToTop()
  }

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

  const handleCreatePlayerFromSearch = (initialContact: string) => {
    setAddPlayerInitialContact(initialContact.trim())
    navigateTo('add')
  }

  const closeReleaseNotes = () => {
    window.electronAPI.markReleaseNotesSeen().catch(() => {
      // Seeing the same notes again is less harmful than blocking the app.
    })
    setReleaseNotes(null)
  }

  const handleNavDragStart = (event: React.DragEvent<HTMLButtonElement>, navId: SidebarNavId) => {
    draggingNavIdRef.current = navId
    suppressNavClickRef.current = true
    setDraggingNavId(navId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', navId)
  }

  const handleNavDragOver = (event: React.DragEvent<HTMLDivElement>, targetId: SidebarNavId) => {
    const draggedId = draggingNavIdRef.current
    if (!draggedId) return
    if (draggedId === targetId) {
      setSidebarDropTarget(null)
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleNavDragEnter = (event: React.DragEvent<HTMLDivElement>, targetId: SidebarNavId) => {
    event.preventDefault()
    const draggedId = draggingNavIdRef.current
    if (!draggedId || draggedId === targetId) return

    setSidebarDropTarget(targetId)
    setSidebarNavOrder((currentOrder) => {
      const nextOrder = moveSidebarNavToTarget(currentOrder, draggedId, targetId)
      saveSidebarNavOrder(nextOrder)
      return nextOrder
    })
  }

  const handleNavDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setSidebarDropTarget(null)
  }

  const handleNavDragEnd = () => {
    draggingNavIdRef.current = null
    setDraggingNavId(null)
    setSidebarDropTarget(null)
    window.setTimeout(() => {
      suppressNavClickRef.current = false
    }, 0)
  }

  const handleNavClick = (onClick: () => void) => {
    if (suppressNavClickRef.current) return
    onClick()
  }

  const sidebarNavItems: Record<SidebarNavId, {
    icon: React.ReactNode
    label: string
    active: boolean
    onClick: () => void
  }> = {
    search: {
      icon: <Search size={20} />,
      label: 'Поиск игрока',
      active: currentView === 'search' || currentView === 'form',
      onClick: () => navigateTo('search'),
    },
    list: {
      icon: <Users size={20} />,
      label: 'Все игроки',
      active: currentView === 'list',
      onClick: () => navigateTo('list'),
    },
    add: {
      icon: <UserPlus size={20} />,
      label: 'Добавить игрока',
      active: currentView === 'add',
      onClick: () => {
        setAddPlayerInitialContact('')
        navigateTo('add')
      },
    },
    roomInfo: {
      icon: <Info size={20} />,
      label: 'Инфо по румам',
      active: currentView === 'roomInfo',
      onClick: () => {
        navigateTo('roomInfo')
        setRoomInfoHomeSignal((value) => value + 1)
      },
    },
    linkVerification: {
      icon: <Link2 size={20} />,
      label: 'Проверка привязки',
      active: currentView === 'linkVerification',
      onClick: () => navigateTo('linkVerification'),
    },
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-20 lg:w-64 flex flex-col bg-slate-800/50 backdrop-blur-md border-r border-slate-700/50 transition-all duration-300">
        <div className="p-4 lg:p-6 mb-8 flex items-center justify-center lg:justify-start gap-3">
          <button
            type="button"
            onClick={() => navigateTo('search')}
            className="rounded-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            title="На главный экран"
          >
            <img
              src="./icon.png"
              alt=""
              className="h-12 w-12 rounded-xl object-cover shadow-lg shadow-blue-500/20"
            />
          </button>
          <h1 className="hidden lg:block font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Transactioner
          </h1>
        </div>

        <div className="flex-1 flex flex-col gap-2 px-3">
          {sidebarNavOrder.map((navId) => {
            const item = sidebarNavItems[navId]
            return (
              <NavItem
                key={navId}
                icon={item.icon}
                label={item.label}
                active={item.active}
                dragging={draggingNavId === navId}
                dragTarget={sidebarDropTarget === navId}
                onClick={() => handleNavClick(item.onClick)}
                onDragStart={(event) => handleNavDragStart(event, navId)}
                onDragEnter={(event) => handleNavDragEnter(event, navId)}
                onDragOver={(event) => handleNavDragOver(event, navId)}
                onDrop={handleNavDrop}
                onDragEnd={handleNavDragEnd}
              />
            )
          })}
        </div>

        {appInfo?.version && (
          <div className="px-3 pb-4">
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 px-2 py-2 text-center text-[11px] font-semibold text-slate-200 shadow-inner lg:px-3 lg:text-left lg:text-xs">
              <span className="hidden text-slate-400 lg:inline">Версия </span>
              <span>v{appInfo.version}</span>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main ref={mainRef} className="min-w-0 flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative">
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
            <SearchPlayerView
              onFound={handlePlayerFound}
              onCreate={handleCreatePlayerFromSearch}
            />
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
            <AddPlayerView
              key={addPlayerInitialContact || 'blank'}
              initialContactValue={addPlayerInitialContact}
              onSuccess={(p) => handlePlayerFound(p)}
            />
          )}
          {currentView === 'roomInfo' && (
            <RoomInfoView homeSignal={roomInfoHomeSignal} />
          )}
          {currentView === 'linkVerification' && (
            <LinkVerificationView />
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

      {releaseNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
          <div className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Что нового</h2>
                <p className="text-sm text-slate-500">Версия {releaseNotes.version}</p>
              </div>
              <button
                type="button"
                onClick={closeReleaseNotes}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                title="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[56vh] overflow-y-auto px-6 py-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">
                {releaseNotes.notes}
              </pre>
              <p className="mt-5 break-all border-t border-slate-800 pt-4 text-xs text-slate-500">
                Файл с этим текстом находится в папке приложения: {releaseNotes.notesPath}
              </p>
            </div>
            <div className="border-t border-slate-800 px-6 py-4 text-right">
              <button
                type="button"
                onClick={closeReleaseNotes}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  dragging,
  dragTarget,
  onClick,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  dragging: boolean
  dragTarget: boolean
  onClick: () => void
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void
  onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  return (
    <div
      className="relative"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        draggable
        aria-grabbed={dragging}
        title={`${label}. Перетащите, чтобы изменить порядок`}
        onClick={onClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`
          flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group cursor-grab active:cursor-grabbing
          ${dragging ? 'opacity-40 scale-[0.98]' : ''}
          ${dragTarget ? 'ring-2 ring-blue-400/70' : ''}
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
    </div>
  )
}

export default App
