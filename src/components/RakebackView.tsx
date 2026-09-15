import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Copy, Save, Settings } from 'lucide-react'
import {
  accountDataLine,
  composeCryptoRakebackTemplate,
  composeStatsRequestTemplate,
  currentMonthRange,
  previousMonthRange,
  trailingMonthRange,
} from '../utils/rakeback'
import {
  getWalletNetworkValidationWarning,
  isCryptoWalletNetwork,
} from '../utils/walletValidation'
import {
  loadRakebackExplorerSettings,
  type RakebackExplorerSettings,
  saveRakebackExplorerSettings,
  updateRakebackExplorerSettings,
} from '../utils/rakebackSettings'

interface RakebackViewProps {
  player: Player
  account: Account | null
  onAccountSelect: (account: Account) => void
  onPlayerUpdate?: (updates: Partial<Player>) => void
}

type RakebackSearchState = 'idle' | 'searching' | 'found' | 'not_found' | 'not_configured' | 'error'
type QuickSearchButton = 'previous' | 'two' | 'three' | 'custom' | null

const walletTypeOptions = [
  'USDT TRC20',
  'USDT BEP20',
  'USDT ERC20',
  'USDC ERC20',
  'BTC',
  'Skrill',
  'Luxon',
  'Neteller',
]

const inputClass = (hasError = false) => `w-full rounded-xl border bg-slate-900 p-3 text-slate-100 placeholder-slate-600/60 outline-none transition-all ${
  hasError ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-blue-500'
}`

const accountKey = (item: Account, index = 0) => {
  if (item.id) return `id:${item.id}`
  return [
    'account',
    index,
    item.roomName || item.room_name || '',
    item.roomUsername || item.room_username || '',
    item.roomPlayerId || item.room_player_id || '',
    item.email || '',
  ].join(':')
}

const findAccountKey = (accounts: Account[] = [], account: Account | null) => {
  if (!accounts.length) return ''
  if (!account) return accountKey(accounts[0], 0)

  const index = accounts.findIndex((item) => (
    (account.id && item.id === account.id) ||
    item === account ||
    (
      (item.roomName || item.room_name || '') === (account.roomName || account.room_name || '') &&
      (item.roomUsername || item.room_username || '') === (account.roomUsername || account.room_username || '') &&
      (item.roomPlayerId || item.room_player_id || '') === (account.roomPlayerId || account.room_player_id || '') &&
      (item.email || '') === (account.email || '')
    )
  ))
  return index >= 0 ? accountKey(accounts[index], index) : accountKey(accounts[0], 0)
}

const shortHash = (value: string) => (
  value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value
)

const blockchainLabel = (network: string) => {
  const normalized = network.trim().toUpperCase()
  if (normalized.includes('TRC20')) return 'Tron / TRC20'
  if (normalized.includes('ERC20')) return 'Ethereum / ERC20'
  if (normalized.includes('BEP20')) return 'BNB Smart Chain / BEP20'
  if (normalized.includes('BTC')) return 'Bitcoin'
  return ''
}

const openNativeDatePicker = (input: HTMLInputElement) => {
  const inputWithPicker = input as HTMLInputElement & { showPicker?: () => void }
  inputWithPicker.showPicker?.()
}

export default function RakebackView({
  player,
  account,
  onAccountSelect,
  onPlayerUpdate,
}: RakebackViewProps) {
  const savedWallet = player.default_wallet || ''
  const savedWalletNetwork = player.default_wallet_network || ''
  const startsAsCrypto = isCryptoWalletNetwork(savedWalletNetwork)
  const initialRange = startsAsCrypto ? currentMonthRange() : previousMonthRange()

  const [wallet, setWallet] = useState(savedWallet)
  const [network, setNetwork] = useState(savedWalletNetwork)
  const [amount, setAmount] = useState('')
  const [periodFrom, setPeriodFrom] = useState(initialRange.from)
  const [periodTo, setPeriodTo] = useState(initialRange.to)
  const [transaction, setTransaction] = useState('')
  const [message, setMessage] = useState('')
  const [manualTemplate, setManualTemplate] = useState('')
  const [isTemplateManual, setIsTemplateManual] = useState(false)
  const [copied, setCopied] = useState(false)
  const [walletSaveState, setWalletSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [searchState, setSearchState] = useState<RakebackSearchState>('idle')
  const [quickSearchButton, setQuickSearchButton] = useState<QuickSearchButton>(null)
  const [explorerSettings, setExplorerSettings] = useState(loadRakebackExplorerSettings)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<RakebackExplorerSettings>(explorerSettings)
  const [settingsSaveState, setSettingsSaveState] = useState<'idle' | 'saved'>('idle')
  const [foundTransactions, setFoundTransactions] = useState<RakebackTransactionCandidate[]>([])
  const [selectedTransactionHashes, setSelectedTransactionHashes] = useState<string[]>([])
  const playerIdentity = String(player.id || player.messenger_username)
  const [selectedAccountState, setSelectedAccountState] = useState<{ playerIdentity: string, keys: string[] }>(() => {
    const accounts = player.accounts || []
    const key = findAccountKey(accounts, account)
    return { playerIdentity: String(player.id || player.messenger_username), keys: key ? [key] : [] }
  })
  const walletRef = useRef<HTMLInputElement | null>(null)
  const transactionsListRef = useRef<HTMLDivElement | null>(null)

  const isCrypto = isCryptoWalletNetwork(network)
  const playerAccounts = useMemo(() => player.accounts || [], [player.accounts])
  const defaultSelectedAccountKeys = useMemo(() => {
    const key = findAccountKey(playerAccounts, account)
    return key ? [key] : []
  }, [account, playerAccounts])
  const selectedAccountKeys = selectedAccountState.playerIdentity === playerIdentity
    ? selectedAccountState.keys
    : defaultSelectedAccountKeys
  const selectedAccounts = useMemo(
    () => playerAccounts.filter((item, index) => selectedAccountKeys.includes(accountKey(item, index))),
    [playerAccounts, selectedAccountKeys]
  )
  const selectedTransactions = useMemo(
    () => foundTransactions.filter(item => selectedTransactionHashes.includes(item.hash)),
    [foundTransactions, selectedTransactionHashes]
  )
  const walletWarning = useMemo(
    () => getWalletNetworkValidationWarning(wallet, network),
    [network, wallet]
  )
  const currentBlockchainLabel = blockchainLabel(network)
  const isSearching = searchState === 'searching'

  const generatedTemplate = useMemo(() => (
    isCrypto
      ? composeCryptoRakebackTemplate({
        amount,
        transaction,
        transactions: selectedTransactions.length
          ? selectedTransactions.map(item => ({ amount: item.amount, date: item.date, explorerUrl: item.explorerUrl }))
          : undefined,
      })
      : composeStatsRequestTemplate({
        account,
        accounts: selectedAccounts,
        from: periodFrom,
        to: periodTo,
      })
  ), [account, amount, isCrypto, periodFrom, periodTo, selectedAccounts, selectedTransactions, transaction])
  const effectiveTemplate = isTemplateManual ? manualTemplate : generatedTemplate

  useEffect(() => {
    if (searchState === 'found' && foundTransactions.length) {
      transactionsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [foundTransactions.length, searchState])

  const updateGeneratedField = (callback: () => void) => {
    callback()
    if (!isTemplateManual) setManualTemplate('')
  }

  const resetSearchResults = () => {
    setSearchState('idle')
    setFoundTransactions([])
    setSelectedTransactionHashes([])
    setMessage('')
  }

  const searchTransactions = async (
    range = { from: periodFrom, to: periodTo },
    sourceButton: QuickSearchButton = null
  ) => {
    setMessage('')
    setQuickSearchButton(sourceButton)
    if (!network.trim()) {
      setSearchState('not_configured')
      setQuickSearchButton(null)
      setMessage('Выберите тип кошелька.')
      return
    }
    if (!wallet.trim()) {
      setSearchState('not_configured')
      setQuickSearchButton(null)
      walletRef.current?.focus()
      setMessage('Введите кошелек рейкбека.')
      return
    }
    if (walletWarning) {
      walletRef.current?.focus()
      walletRef.current?.select()
      setQuickSearchButton(null)
      setMessage(walletWarning)
      return
    }
    setSearchState('searching')
    try {
      const result = await window.electronAPI.searchRakebackTransaction({
        amount,
        network,
        wallet,
        periodFrom: range.from,
        periodTo: range.to,
        affiliateWallets: explorerSettings.affiliateWallets,
      })
      const candidates = result.candidates || []
      const candidate = candidates[0]
      if (!result.success || !candidate) {
        setFoundTransactions([])
        setSelectedTransactionHashes([])
        setSearchState(result.status === 'not_configured' ? 'not_configured' : 'not_found')
        setMessage(result.status === 'not_configured'
          ? (result.error || 'Добавьте кошелек, с которого отправляется рейкбек.')
          : 'Транзакция не найдена')
        return
      }
      setFoundTransactions(candidates)
      setSelectedTransactionHashes(candidates.map(item => item.hash))
      updateGeneratedField(() => {
        setTransaction(candidate.explorerUrl)
      })
      setSearchState('found')
      setMessage(candidates.length > 1
        ? `Найдено ${candidates.length} транзакций. В шаблон подставлены все найденные.`
        : `Транзакция найдена: ${candidate.hash}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setSearchState(errorMessage.includes('Добавьте') ? 'not_configured' : 'error')
      setMessage(errorMessage)
    } finally {
      setQuickSearchButton(null)
    }
  }

  const applyPreviousMonth = async () => {
    const range = isCrypto ? trailingMonthRange(1) : previousMonthRange()
    updateGeneratedField(() => {
      setPeriodFrom(range.from)
      setPeriodTo(range.to)
      resetSearchResults()
    })
    if (isCrypto) await searchTransactions(range, 'previous')
  }

  const applyTrailingMonths = async (monthCount: number) => {
    const range = trailingMonthRange(monthCount)
    updateGeneratedField(() => {
      setPeriodFrom(range.from)
      setPeriodTo(range.to)
      resetSearchResults()
    })
    if (isCrypto) await searchTransactions(range, monthCount === 2 ? 'two' : 'three')
  }

  const saveWalletIfConfirmed = async () => {
    if (!player.id) return true
    const trimmedWallet = wallet.trim()
    const trimmedNetwork = network.trim()
    if (!trimmedWallet || !trimmedNetwork) return true
    if (trimmedWallet === savedWallet.trim() && trimmedNetwork === savedWalletNetwork.trim()) return true
    if (walletWarning) {
      walletRef.current?.focus()
      walletRef.current?.select()
      return false
    }

    const shouldSave = window.confirm('Сохранить этот кошелек и сеть как значения по умолчанию для игрока?')
    if (!shouldSave) return true

    setWalletSaveState('saving')
    const result = await window.electronAPI.updateDefaultWalletDetails(player.id, trimmedWallet, trimmedNetwork)
    if (!result.success) {
      setWalletSaveState('error')
      setMessage(result.error || 'Не удалось сохранить кошелёк рейкбека')
      return false
    }

    setWalletSaveState('saved')
    onPlayerUpdate?.({
      default_wallet: trimmedWallet,
      default_wallet_network: trimmedNetwork,
    })
    return true
  }

  const handleCopy = async () => {
    setMessage('')
    if (walletWarning) {
      walletRef.current?.focus()
      walletRef.current?.select()
      setMessage(walletWarning)
      return
    }
    const saved = await saveWalletIfConfirmed()
    if (!saved) return
    await navigator.clipboard.writeText(effectiveTemplate)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const toggleAccount = (item: Account, index: number) => {
    const key = accountKey(item, index)
    setSelectedAccountState((current) => {
      const currentKeys = current.playerIdentity === playerIdentity ? current.keys : defaultSelectedAccountKeys
      return {
        playerIdentity,
        keys: currentKeys.includes(key)
          ? currentKeys.filter(itemKey => itemKey !== key)
          : [...currentKeys, key],
      }
    })
    onAccountSelect(item)
  }

  const toggleTransaction = (hash: string) => {
    setSelectedTransactionHashes((current) => (
      current.includes(hash)
        ? current.filter(itemHash => itemHash !== hash)
        : [...current, hash]
    ))
  }

  const openSettings = () => {
    setSettingsDraft(explorerSettings)
    setSettingsSaveState('idle')
    setIsSettingsOpen(true)
  }

  const saveSettings = () => {
    setExplorerSettings(settingsDraft)
    saveRakebackExplorerSettings(localStorage, settingsDraft)
    resetSearchResults()
    setSettingsSaveState('saved')
  }

  if (isSettingsOpen) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              <ArrowLeft size={16} /> Назад к рейкбеку
            </button>
            <h2 className="text-2xl font-bold text-slate-100">Настройки поиска транзакций</h2>
            <p className="mt-2 text-sm text-slate-500">
              Эти кошельки общие для всех игроков. Их нужно сохранить один раз, после этого поиск рейкбека будет использовать их в любой карточке игрока.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg">
          <label className="mb-2 block text-sm font-medium text-slate-400">
            Кошельки, с которых отправляется рейкбек
          </label>
          <textarea
            value={settingsDraft.affiliateWallets}
            onChange={(event) => {
              const next = updateRakebackExplorerSettings(localStorage, settingsDraft, {
                affiliateWallets: event.target.value,
              })
              setSettingsDraft(next)
              setExplorerSettings(next)
              setSettingsSaveState('saved')
              resetSearchResults()
            }}
            placeholder={`USDT TRC20 T...\nUSDT ERC20 0x...\nUSDC ERC20 0x...\nUSDT BEP20 0x...`}
            className="min-h-[220px] w-full rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-slate-100 placeholder-slate-600/60 outline-none transition-all focus:border-blue-500"
          />
          <p className="mt-3 text-xs text-slate-500">
            Можно писать с подписью сети или просто адресами. При поиске приложение само выберет блокчейн по типу кошелька игрока, например USDT ERC20 → Ethereum/ERC20.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500"
            >
              <Save size={18} /> Сохранить кошельки
            </button>
            {settingsSaveState === 'saved' && (
              <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                сохранено для всех игроков
              </span>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 pb-10 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
              Рейкбек <span className="rounded-lg bg-blue-400/10 px-3 py-1 text-blue-400">{player.messenger_username}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={openSettings}
            className="group relative inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
          >
            <Settings size={16} /> Настройки
            <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs font-medium leading-relaxed text-slate-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              Здесь добавляются кошельки WPD, с которых платится рейкбек.
            </span>
          </button>
        </div>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
          <label className="mb-2 block text-sm font-medium text-slate-400">Выберите аккаунт игрока в руме</label>
          <div className="flex flex-wrap gap-2">
            {player.accounts?.map((item, index) => {
              const roomName = item.roomName || item.room_name || ''
              const accountLine = accountDataLine(item)
              const active = selectedAccountKeys.includes(accountKey(item, index))
              return (
                <button
                  key={`${roomName}-${index}`}
                  type="button"
                  onClick={() => toggleAccount(item, index)}
                  className={`rounded-lg border px-4 py-2 text-left text-sm font-medium transition-all ${
                    active
                      ? 'border-blue-400 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {roomName}{accountLine ? ` (${accountLine})` : ''}
                </button>
              )
            })}
            {!player.accounts?.length && <span className="text-sm text-red-400">У игрока нет привязанных румов.</span>}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Можно выбрать один или несколько аккаунтов: клик включает аккаунт, повторный клик снимает выбор.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Тип кошелька</label>
              <input
                list="rakeback-wallet-types"
                value={network}
                onChange={(event) => {
                  updateGeneratedField(() => {
                    setNetwork(event.target.value)
                    setWalletSaveState('idle')
                    resetSearchResults()
                  })
                }}
                placeholder="USDT TRC20 / BTC / Skrill"
                className={inputClass()}
              />
              <datalist id="rakeback-wallet-types">
                {walletTypeOptions.map((option) => <option key={option} value={option} />)}
              </datalist>
              {network.trim() && (
                <p className="mt-2 text-xs text-slate-500">
                  {isCrypto
                    ? `Крипто: поиск будет выполнен в сети ${currentBlockchainLabel || network}.`
                    : 'Не крипто: будет сформирован запрос статистики.'}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Кошелёк рейкбека</label>
              <input
                ref={walletRef}
                value={wallet}
                onChange={(event) => {
                  updateGeneratedField(() => {
                    setWallet(event.target.value)
                    setWalletSaveState('idle')
                    resetSearchResults()
                  })
                }}
                placeholder="T..., 0x..., bc1..., email"
                className={inputClass(Boolean(walletWarning))}
              />
              {walletWarning && <p className="mt-2 text-xs text-red-300">{walletWarning}</p>}
            </div>

            {walletSaveState !== 'idle' && (
              <div className="md:col-span-2 rounded-xl bg-slate-900 px-3 py-2">
                {walletSaveState === 'saving' && <span className="text-xs text-blue-300">сохраняю кошелёк…</span>}
                {walletSaveState === 'saved' && <span className="text-xs text-emerald-300">кошелёк сохранён как основной</span>}
                {walletSaveState === 'error' && <span className="text-xs text-red-300">ошибка сохранения кошелька</span>}
              </div>
            )}

            {isCrypto && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Сумма выплаты (необязательно)</label>
                <input
                  value={amount}
                  onChange={(event) => updateGeneratedField(() => {
                    setAmount(event.target.value)
                    resetSearchResults()
                  })}
                  placeholder="Можно оставить пустым; сумма только помогает отсортировать"
                  className={inputClass()}
                />
              </div>
            )}

            {isCrypto && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">TX hash / ссылка</label>
                <input
                  value={transaction}
                  onChange={(event) => updateGeneratedField(() => {
                    setTransaction(event.target.value)
                    resetSearchResults()
                  })}
                  placeholder="Заполнится после поиска или можно вставить вручную"
                  className={inputClass()}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Период с</label>
              <input type="date" value={periodFrom} onClick={(event) => openNativeDatePicker(event.currentTarget)} onFocus={(event) => openNativeDatePicker(event.currentTarget)} onChange={(event) => updateGeneratedField(() => {
                setPeriodFrom(event.target.value)
                resetSearchResults()
              })} className={inputClass()} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-400">Период по</label>
              <input type="date" value={periodTo} onClick={(event) => openNativeDatePicker(event.currentTarget)} onFocus={(event) => openNativeDatePicker(event.currentTarget)} onChange={(event) => updateGeneratedField(() => {
                setPeriodTo(event.target.value)
                resetSearchResults()
              })} className={inputClass()} />
            </div>
          </div>

          {isCrypto && foundTransactions.length > 0 && (
            <div ref={transactionsListRef} className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-emerald-100">Найденные транзакции</h3>
                  <p className="text-xs text-emerald-200/70">
                    По умолчанию в шаблон попадают все найденные. Клик по транзакции включает или убирает её из шаблона.
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  выбрано {selectedTransactionHashes.length}
                </span>
              </div>
              <div className="space-y-2">
                {foundTransactions.map((item, index) => {
                  const active = selectedTransactionHashes.includes(item.hash)
                  return (
                    <button
                      key={item.hash}
                      type="button"
                      onClick={() => toggleTransaction(item.hash)}
                      className={`w-full rounded-xl border p-3 text-left transition-all ${
                        active
                          ? 'border-emerald-300 bg-emerald-400/15 text-emerald-50'
                          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">
                          #{index + 1} · Amount: {item.amount}{item.date ? ` · ${item.date}` : ''}
                        </span>
                        <span className="font-mono text-xs">{shortHash(item.hash)}</span>
                      </div>
                      <div className="mt-1 font-mono text-xs text-slate-400">from: {shortHash(item.from)}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyPreviousMonth}
              disabled={isSearching}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-wait disabled:opacity-70"
            >
              {quickSearchButton === 'previous' ? 'Ищу…' : 'Прошлый месяц'}
            </button>
            {isCrypto && (
              <>
                <button
                  type="button"
                  onClick={() => applyTrailingMonths(2)}
                  disabled={isSearching}
                  className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-wait disabled:opacity-70"
                >
                  {quickSearchButton === 'two' ? 'Ищу…' : '2 месяца'}
                </button>
                <button
                  type="button"
                  onClick={() => applyTrailingMonths(3)}
                  disabled={isSearching}
                  className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-wait disabled:opacity-70"
                >
                  {quickSearchButton === 'three' ? 'Ищу…' : '3 месяца'}
                </button>
                <button
                  type="button"
                  onClick={() => searchTransactions(undefined, 'custom')}
                  disabled={isSearching}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70"
                >
                  {quickSearchButton === 'custom' ? 'Ищу…' : 'Кастом по дате'}
                </button>
              </>
            )}
          </div>

          {message && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              searchState === 'found'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                : searchState === 'not_configured' || searchState === 'not_found'
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}>
              {message}
            </div>
          )}

          {isCrypto && !explorerSettings.affiliateWallets.trim() && (
            <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              Добавьте кошелек, с которого отправляется рейкбек.
            </div>
          )}
        </section>
      </div>

      <aside className="min-w-0 flex-1 lg:sticky lg:top-8 lg:h-fit">
        <div className="flex h-full flex-col rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-800/80 p-6 shadow-2xl ring-1 ring-white/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-200">{isCrypto ? 'Шаблон выплаты' : 'Шаблон запроса статистики'}</h3>
            <div className="flex items-center gap-2">
              {isTemplateManual && (
                <button
                  type="button"
                  onClick={() => {
                    setIsTemplateManual(false)
                    setManualTemplate('')
                  }}
                  className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-600"
                >
                  Сбросить правку
                </button>
              )}
              {account && <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-400">{account.roomName || account.room_name}</span>}
            </div>
          </div>

          <textarea
            value={effectiveTemplate}
            onChange={(event) => {
              setIsTemplateManual(true)
              setManualTemplate(event.target.value)
            }}
            className="min-h-[320px] flex-1 resize-y rounded-xl border border-slate-800/50 bg-slate-900/50 p-4 font-mono text-sm leading-relaxed text-slate-300 outline-none"
          />

          <div className="mt-4 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!selectedAccounts.length}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                copied ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-500'
              }`}
            >
              {copied ? <><CheckCircle2 size={18} /> Скопировано</> : <><Copy size={18} /> Скопировать</>}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Если при копировании шаблона кошелёк отличается от сохранённого, приложение спросит, сохранить ли его как основной.
          </p>
        </div>
      </aside>
    </div>
  )
}
