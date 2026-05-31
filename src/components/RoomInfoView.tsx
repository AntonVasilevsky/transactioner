import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Check, Copy, Search, Settings } from 'lucide-react'
import RoomAdminView from './RoomAdminView'

type RoomInfoMode = 'wallets' | 'deals'
const pinnedRoomOrder = ['nexa', 'champion-poker', 'redstar']

const dealTypeLabels: Record<RoomDealType, string> = {
  General: 'Общая',
  Direct: 'Прямая',
  Agent: 'Агентская',
}

const roomName = (profiles: RoomProfileInfo[], roomKey: string) =>
  profiles.find((profile) => profile.room_key === roomKey)?.display_name || roomKey

const uniqueDealTypes = (items: Array<{ deal_type: RoomDealType }>) =>
  Array.from(new Set(items.map((item) => item.deal_type))).sort()

const sortRooms = (profiles: RoomProfileInfo[]) => [...profiles].sort((left, right) => {
  const leftPinned = pinnedRoomOrder.indexOf(left.room_key)
  const rightPinned = pinnedRoomOrder.indexOf(right.room_key)
  const leftRank = leftPinned === -1 ? Number.POSITIVE_INFINITY : leftPinned
  const rightRank = rightPinned === -1 ? Number.POSITIVE_INFINITY : rightPinned

  if (leftRank !== rightRank) return leftRank - rightRank
  return left.display_name.localeCompare(right.display_name, undefined, { sensitivity: 'base' })
})

const countryStatusLabels: Record<RoomCountryStatus, string> = {
  Available: 'доступен',
  Unavailable: 'недоступен',
  Check: 'нужно уточнить',
}

const walletCopyText = (wallet: RoomWalletInfo) => [
  `${wallet.currency} ${wallet.network}`.trim(),
  wallet.wallet_address,
  wallet.memo_tag ? `Memo/Tag: ${wallet.memo_tag}` : '',
  wallet.fee_text ? `Комиссия: ${wallet.fee_text}` : '',
  wallet.verified_at ? `Актуально: ${wallet.verified_at}` : '',
  wallet.note ? `Комментарий: ${wallet.note}` : '',
].filter(Boolean).join('\n')

const dealCopyText = (deal: RoomDealInfo, kind: 'short' | 'full') => {
  if (kind === 'short') return deal.short_text
  return [deal.short_text, deal.full_text].filter(Boolean).join('\n\n')
}

export default function RoomInfoView({ homeSignal }: { homeSignal: number }) {
  const [mode, setMode] = useState<RoomInfoMode>('wallets')
  const [index, setIndex] = useState<RoomKnowledgeIndex | null>(null)
  const [selectedRoomKey, setSelectedRoomKey] = useState('')
  const [roomQuery, setRoomQuery] = useState('')
  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false)
  const [selectedDealType, setSelectedDealType] = useState<RoomDealType>('General')
  const [selectedCountryCode, setSelectedCountryCode] = useState('')
  const [language, setLanguage] = useState<RoomLanguage>('RU')
  const [wallets, setWallets] = useState<RoomWalletInfo[]>([])
  const [deals, setDeals] = useState<RoomDealInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isAdminMounted, setIsAdminMounted] = useState(false)
  const [adminSessionKey, setAdminSessionKey] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)
  const hasSeenHomeSignal = useRef(false)

  useEffect(() => {
    let active = true
    window.electronAPI.getRoomKnowledgeIndex()
      .then((result) => {
        if (!active) return
        const sortedProfiles = sortRooms(result.profiles)
        const firstRoom = sortedProfiles[0]
        setIndex(result)
        setSelectedRoomKey(firstRoom?.room_key || '')
        setRoomQuery(firstRoom?.display_name || '')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshToken])

  useEffect(() => {
    if (!hasSeenHomeSignal.current) {
      hasSeenHomeSignal.current = true
      return
    }
    setIsAdminOpen(false)
    setRefreshToken((value) => value + 1)
  }, [homeSignal])

  const availableDealTypes = useMemo(() => {
    if (!index || !selectedRoomKey) return ['General'] as RoomDealType[]
    const items = [
      ...index.dealOptions.filter((item) => item.room_key === selectedRoomKey),
      ...index.walletOptions.filter((item) => item.room_key === selectedRoomKey),
      ...index.paymentMethods.filter((item) => item.room_key === selectedRoomKey),
    ]
    const values = uniqueDealTypes(items)
    return values.length ? values : ['General'] as RoomDealType[]
  }, [index, selectedRoomKey])

  const filteredRoomProfiles = useMemo(() => {
    const profiles = index?.profiles || []
    const selectedRoomName = roomName(profiles, selectedRoomKey)
    const rawQuery = roomQuery.trim()
    const query = rawQuery && rawQuery !== selectedRoomName
      ? rawQuery.toLowerCase()
      : ''
    const filteredProfiles = query ? profiles.filter((profile) => (
      profile.display_name.toLowerCase().includes(query) ||
      profile.room_key.toLowerCase().includes(query) ||
      String(profile.network_name || '').toLowerCase().includes(query)
    )) : profiles
    return sortRooms(filteredProfiles)
  }, [index, roomQuery, selectedRoomKey])

  const roomCountryRows = useMemo(() => (
    (index?.countryOptions || [])
      .filter((country) => country.room_key === selectedRoomKey)
      .sort((left, right) => left.country_name.localeCompare(right.country_name, undefined, { sensitivity: 'base' }))
  ), [index, selectedRoomKey])

  const roomCountryOptions = useMemo(() => {
    const seen = new Set<string>()
    return roomCountryRows.filter((country) => {
      if (seen.has(country.country_code)) return false
      seen.add(country.country_code)
      return true
    })
  }, [roomCountryRows])

  const selectedCountryRows = useMemo(() => (
    roomCountryRows.filter((country) => country.country_code === selectedCountryCode)
  ), [roomCountryRows, selectedCountryCode])

  const countryAllowedDealTypes = useMemo(() => (
    Array.from(new Set(
      selectedCountryRows
        .filter((country) => country.status === 'Available' && country.deal_type)
        .map((country) => country.deal_type as RoomDealType)
    ))
  ), [selectedCountryRows])

  const countryBlocksDeals = mode === 'deals'
    && Boolean(selectedCountryCode)
    && selectedCountryRows.some((country) => country.status === 'Unavailable')
    && countryAllowedDealTypes.length === 0

  const dealTypeChoices = mode === 'deals' && selectedCountryCode && countryAllowedDealTypes.length > 0
    ? availableDealTypes.filter((type) => countryAllowedDealTypes.includes(type))
    : availableDealTypes

  const activeDealType = dealTypeChoices.includes(selectedDealType)
    ? selectedDealType
    : dealTypeChoices.includes('Agent')
      ? 'Agent'
      : dealTypeChoices.includes('Direct')
        ? 'Direct'
      : dealTypeChoices[0] || availableDealTypes[0]

  const activeWalletDealType = availableDealTypes.includes('Agent')
    ? 'Agent'
    : availableDealTypes.includes(activeDealType)
      ? activeDealType
      : availableDealTypes[0]

  useEffect(() => {
    if (!selectedRoomKey) return
    let active = true
    window.electronAPI.getRoomWallets(selectedRoomKey, activeWalletDealType)
      .then((result) => {
        if (active) {
          setWallets(result)
        }
      })
    return () => {
      active = false
    }
  }, [selectedRoomKey, activeWalletDealType, refreshToken])

  useEffect(() => {
    if (!selectedRoomKey || countryBlocksDeals) {
      return
    }
    let active = true
    window.electronAPI.getRoomDeals(selectedRoomKey, language, activeDealType)
      .then((result) => {
        if (active) setDeals(result)
      })
    return () => {
      active = false
    }
  }, [selectedRoomKey, activeDealType, language, countryBlocksDeals, refreshToken])

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(''), 1400)
  }

  const selectRoom = (profile: RoomProfileInfo) => {
    setSelectedRoomKey(profile.room_key)
    setSelectedCountryCode('')
    setRoomQuery(profile.display_name)
    setIsRoomPickerOpen(false)
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl text-slate-500">Загрузка справочника...</div>
  }

  return (
    <>
      {isAdminMounted && (
        <div className={isAdminOpen ? '' : 'hidden'}>
          <RoomAdminView
            key={adminSessionKey}
            initialMode="deals"
            onClose={() => {
              setIsAdminOpen(false)
              setRefreshToken((value) => value + 1)
            }}
          />
        </div>
      )}

      {!isAdminOpen && (
    <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-blue-400" />
          <h2 className="text-2xl font-bold text-slate-100">Инфо по румам</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdminMounted(true)
            setAdminSessionKey((value) => value + 1)
            setIsAdminOpen(true)
          }}
          title="Редактировать справочник"
          aria-label="Редактировать справочник"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 transition-colors hover:border-blue-500 hover:text-white"
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-400">Раздел</label>
          <div className="flex rounded-xl bg-slate-950 p-1">
            <ModeButton active={mode === 'wallets'} onClick={() => setMode('wallets')}>Кошельки</ModeButton>
            <ModeButton active={mode === 'deals'} onClick={() => setMode('deals')}>Сделка</ModeButton>
          </div>
        </div>
        <div className="relative min-w-56">
          <label className="mb-1 block text-sm font-medium text-slate-400">Рум</label>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={roomQuery}
              onChange={(event) => {
                setRoomQuery(event.target.value)
                setIsRoomPickerOpen(true)
              }}
              onFocus={(event) => {
                event.target.select()
                setIsRoomPickerOpen(true)
              }}
              onClick={(event) => {
                event.currentTarget.select()
                setIsRoomPickerOpen(true)
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsRoomPickerOpen(false)
                  setRoomQuery(roomName(index?.profiles || [], selectedRoomKey))
                }, 120)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filteredRoomProfiles[0]) {
                  event.preventDefault()
                  selectRoom(filteredRoomProfiles[0])
                }
                if (event.key === 'Escape') {
                  setIsRoomPickerOpen(false)
                  setRoomQuery(roomName(index?.profiles || [], selectedRoomKey))
                }
              }}
              placeholder="Найти рум"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-3 text-slate-100 outline-none focus:border-blue-500"
            />
          </div>
          {isRoomPickerOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-slate-950/40">
              {filteredRoomProfiles.length ? (
                filteredRoomProfiles.map((profile) => (
                  <button
                    key={profile.room_key}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectRoom(profile)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                      profile.room_key === selectedRoomKey
                        ? 'bg-blue-600/20 text-blue-200'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">{profile.display_name}</div>
                    {profile.network_name && <div className="text-xs text-slate-500">{profile.network_name}</div>}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500">Румы не найдены</div>
              )}
            </div>
          )}
        </div>
        {mode === 'deals' && roomCountryOptions.length > 0 && (
          <div className="min-w-56">
            <label className="mb-1 block text-sm font-medium text-slate-400">Страна</label>
            <select
              value={selectedCountryCode}
              onChange={(event) => setSelectedCountryCode(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="">Не выбрана</option>
              {roomCountryOptions.map((country) => (
                <option key={`${country.country_code}-${country.status}-${country.deal_type}`} value={country.country_code}>
                  {country.country_name}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === 'deals' && (
          <div className="min-w-44">
            <label className="mb-1 block text-sm font-medium text-slate-400">Тип сделки</label>
            <select
              value={activeDealType}
              disabled={mode === 'deals' && (dealTypeChoices.length <= 1 || countryBlocksDeals)}
              onChange={(event) => setSelectedDealType(event.target.value as RoomDealType)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500 disabled:text-slate-500"
            >
              {dealTypeChoices.map((type) => (
                <option key={type} value={type}>{dealTypeLabels[type]}</option>
              ))}
            </select>
          </div>
        )}
        {mode === 'deals' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Язык</label>
            <div className="flex rounded-xl bg-slate-950 p-1">
              <ModeButton active={language === 'RU'} onClick={() => setLanguage('RU')}>RU</ModeButton>
              <ModeButton active={language === 'EN'} onClick={() => setLanguage('EN')}>EN</ModeButton>
            </div>
          </div>
        )}
      </div>

      {mode === 'wallets' ? (
        <WalletsPanel
          roomTitle={roomName(index?.profiles || [], selectedRoomKey)}
          wallets={wallets}
          copied={copied}
          onCopy={copyText}
        />
      ) : (
        <DealsPanel
          deals={deals}
          countryRows={selectedCountryRows}
          countryBlocksDeals={countryBlocksDeals}
          selectedCountryCode={selectedCountryCode}
          activeDealType={activeDealType}
          copied={copied}
          onClearCountry={() => setSelectedCountryCode('')}
          onCopy={copyText}
        />
      )}
    </div>
      )}
    </>
  )
}

function ModeButton({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function GhostIconCopyButton({ copied, onClick, label }: { copied: boolean, onClick: () => void, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/55 text-slate-300 transition-colors hover:bg-blue-600/80 hover:text-white"
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  )
}

function WalletsPanel({
  roomTitle,
  wallets,
  copied,
  onCopy,
}: {
  roomTitle: string
  wallets: RoomWalletInfo[]
  copied: string
  onCopy: (key: string, text: string) => void
}) {
  const walletListText = wallets.length
    ? [
        `${roomTitle} — депозитные кошельки`,
        ...wallets.map((wallet) => `${wallet.currency} ${wallet.network}: ${wallet.wallet_address}`.trim()),
      ].join('\n')
    : ''

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-100">Кошельки</h3>
          {wallets.length > 0 && (
            <GhostIconCopyButton
              copied={copied === 'wallets-all'}
              label="Скопировать все кошельки"
              onClick={() => onCopy('wallets-all', walletListText)}
            />
          )}
        </div>
        {wallets.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-700/60">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-24 px-3 py-2">Монета</th>
                  <th className="w-24 px-3 py-2">Сеть</th>
                  <th className="px-3 py-2">Адрес</th>
                  <th className="w-14 px-2 py-2 text-right" aria-label="Копирование" />
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr
                    key={wallet.id}
                    className="border-t border-slate-700/60 bg-slate-900/50 hover:bg-slate-900"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-100">{wallet.currency}</td>
                    <td className="px-3 py-3 text-slate-300">{wallet.network}</td>
                    <td className="min-w-0 break-all px-3 py-3 font-mono text-xs text-slate-300">{wallet.wallet_address}</td>
                    <td className="px-2 py-3 text-right">
                      <GhostIconCopyButton
                        copied={copied === `wallet-${wallet.id}`}
                        label={`Скопировать ${wallet.currency} ${wallet.network}`}
                        onClick={() => onCopy(`wallet-${wallet.id}`, walletCopyText(wallet))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="Кошельки для этого рума пока не заполнены." />
        )}
      </section>
    </div>
  )
}

function DealsPanel({
  deals,
  countryRows,
  countryBlocksDeals,
  selectedCountryCode,
  activeDealType,
  copied,
  onClearCountry,
  onCopy,
}: {
  deals: RoomDealInfo[]
  countryRows: RoomCountryAvailabilityInfo[]
  countryBlocksDeals: boolean
  selectedCountryCode: string
  activeDealType: RoomDealType
  copied: string
  onClearCountry: () => void
  onCopy: (key: string, text: string) => void
}) {
  if (countryBlocksDeals) {
    return (
      <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
        <CountryNotice
          countryRows={countryRows}
          selectedCountryCode={selectedCountryCode}
          activeDealType={activeDealType}
          onClearCountry={onClearCountry}
        />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      {selectedCountryCode && (
        <CountryNotice
          countryRows={countryRows}
          selectedCountryCode={selectedCountryCode}
          activeDealType={activeDealType}
          onClearCountry={onClearCountry}
        />
      )}
      {!deals.length && (
        <section className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
          <EmptyState text="Сделка для этого рума и языка пока не заполнена." />
        </section>
      )}
      {deals.map((deal) => (
        <section key={deal.id} className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-100">{dealTypeLabels[deal.deal_type]} сделка</h3>
            <GhostIconCopyButton
              copied={copied === `deal-full-${deal.id}`}
              label="Скопировать сделку полностью"
              onClick={() => onCopy(`deal-full-${deal.id}`, dealCopyText(deal, 'full'))}
            />
          </div>
          <div className="relative mb-4 rounded-lg bg-slate-950/60 p-4 pr-14 text-sm leading-6 text-slate-300">
            <div className="absolute right-3 top-3">
              <GhostIconCopyButton
                copied={copied === `deal-short-${deal.id}`}
                label="Скопировать короткую сделку"
                onClick={() => onCopy(`deal-short-${deal.id}`, dealCopyText(deal, 'short'))}
              />
            </div>
            {deal.short_text}
          </div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-400">Полные условия</h4>
          </div>
          <div className="relative whitespace-pre-wrap rounded-lg border border-slate-700/60 bg-slate-900/70 p-4 pr-14 font-sans text-sm leading-6 text-slate-300">
            <div className="absolute right-3 top-3">
              <GhostIconCopyButton
                copied={copied === `deal-conditions-${deal.id}`}
                label="Скопировать полные условия"
                onClick={() => onCopy(`deal-conditions-${deal.id}`, deal.full_text)}
              />
            </div>
            {deal.full_text}
          </div>
        </section>
      ))}
    </div>
  )
}

function CountryNotice({
  countryRows,
  selectedCountryCode,
  activeDealType,
  onClearCountry,
}: {
  countryRows: RoomCountryAvailabilityInfo[]
  selectedCountryCode: string
  activeDealType: RoomDealType
  onClearCountry: () => void
}) {
  const countryName = countryRows[0]?.country_name || selectedCountryCode
  const availableRows = countryRows.filter((country) => country.status === 'Available' && country.deal_type)
  const unavailable = countryRows.some((country) => country.status === 'Unavailable') && availableRows.length === 0
  const uniqueAvailableDeals = Array.from(new Set(availableRows.map((country) => country.deal_type as RoomDealType)))
  const noteText = countryRows
    .map((country) => country.note)
    .filter(Boolean)
    .join(' ')
  const message = unavailable
    ? `${countryName}: рум недоступен по текущим данным.`
    : uniqueAvailableDeals.length === 1
      ? `${countryName}: доступна только ${dealTypeLabels[uniqueAvailableDeals[0]].toLowerCase()} сделка.`
      : uniqueAvailableDeals.length > 1
        ? `${countryName}: доступны ${uniqueAvailableDeals.map((type) => dealTypeLabels[type].toLowerCase()).join(' и ')} сделки. Сейчас показана ${dealTypeLabels[activeDealType].toLowerCase()}.`
        : `${countryName}: статус ${countryRows.map((country) => countryStatusLabels[country.status]).join(', ') || 'не заполнен'}.`

  return (
    <section className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">{message}</div>
          {noteText && <div className="mt-1 text-sm leading-6 text-slate-400">{noteText}</div>}
        </div>
        <button
          type="button"
          onClick={onClearCountry}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-blue-500 hover:text-slate-100"
        >
          <ArrowLeft size={15} />
          Назад
        </button>
      </div>
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}
