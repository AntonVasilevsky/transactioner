import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy, Info, Settings } from 'lucide-react'
import RoomAdminView from './RoomAdminView'
import { sortRoomProfilesByUsage } from '../utils/roomUsageSort'
import { useRoomUsageStats } from '../hooks/useRoomUsageStats'
import ComboboxField from './fields/ComboboxField'
import SelectField from './fields/SelectField'
import { matchesRoomOption, roomProfileOptions } from './fields/fieldOptions'
import {
  roomWalletCopyText,
  roomWalletDisplayTitle,
  roomWalletListTitle,
} from '../utils/roomWalletFormatting'

type RoomInfoMode = 'wallets' | 'deals'

const dealTypeLabels: Record<RoomDealType, string> = {
  General: 'Общая',
  Direct: 'Прямая',
  Agent: 'Агентская',
}
const roomLanguageOptions: RoomLanguage[] = ['RU', 'EN', 'ES']

const roomName = (profiles: RoomProfileInfo[], roomKey: string) =>
  profiles.find((profile) => profile.room_key === roomKey)?.display_name || roomKey

const uniqueDealTypes = (items: Array<{ deal_type: RoomDealType }>) =>
  Array.from(new Set(items.map((item) => item.deal_type))).sort()

const countryStatusLabels: Record<RoomCountryStatus, string> = {
  Available: 'доступен',
  Unavailable: 'недоступен',
  Check: 'нужно уточнить',
}

const normalizePaymentToken = (value?: string | null) => String(value || '').trim().toUpperCase()

const findWalletDepositMethod = (
  wallet: RoomWalletInfo,
  paymentMethods: RoomPaymentMethodInfo[]
) => {
  const currency = normalizePaymentToken(wallet.currency)
  const network = normalizePaymentToken(wallet.network)
  const depositMethods = paymentMethods.filter((method) => method.operation_type === 'Deposit' && method.is_active)
  return depositMethods.find((method) => (
    normalizePaymentToken(method.currency) === currency &&
    normalizePaymentToken(method.network) === network
  )) || depositMethods.find((method) => {
    const methodText = normalizePaymentToken([method.method_name, method.currency, method.network].filter(Boolean).join(' '))
    return Boolean(currency && network && methodText.includes(currency) && methodText.includes(network))
  })
}

const dealCopyText = (deal: RoomDealInfo, kind: 'short' | 'full') => {
  if (kind === 'short') return deal.short_text
  return [deal.short_text, deal.full_text].filter(Boolean).join('\n\n')
}

export default function RoomInfoView({ homeSignal }: { homeSignal: number }) {
  const [mode, setMode] = useState<RoomInfoMode>('deals')
  const [index, setIndex] = useState<RoomKnowledgeIndex | null>(null)
  const [selectedRoomKey, setSelectedRoomKey] = useState('')
  const [selectedDealType, setSelectedDealType] = useState<RoomDealType>('General')
  const [selectedCountryCode, setSelectedCountryCode] = useState('')
  const [language, setLanguage] = useState<RoomLanguage>('RU')
  const [wallets, setWallets] = useState<RoomWalletInfo[]>([])
  const [deals, setDeals] = useState<RoomDealInfo[]>([])
  const roomUsageStats = useRoomUsageStats()
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isAdminMounted, setIsAdminMounted] = useState(false)
  const [adminSessionKey, setAdminSessionKey] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)
  const hasSeenHomeSignal = useRef(false)
  const selectedRoomKeyRef = useRef('')
  const roomUsageStatsRef = useRef<RoomRegistrationStat[]>([])

  useEffect(() => {
    selectedRoomKeyRef.current = selectedRoomKey
  }, [selectedRoomKey])

  useEffect(() => {
    roomUsageStatsRef.current = roomUsageStats
  }, [roomUsageStats])

  useEffect(() => {
    let active = true
    window.electronAPI.getRoomKnowledgeIndex()
      .then((result) => {
        if (!active) return
        const sortedProfiles = sortRoomProfilesByUsage(result.profiles, roomUsageStatsRef.current)
        const selectedRoom = sortedProfiles.find((profile) => profile.room_key === selectedRoomKeyRef.current) || sortedProfiles[0]
        setIndex(result)
        setSelectedRoomKey(selectedRoom?.room_key || '')
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

  const roomOptions = useMemo(
    () => roomProfileOptions(sortRoomProfilesByUsage(index?.profiles || [], roomUsageStats)),
    [index, roomUsageStats]
  )

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

  const walletRoomPaymentMethods = useMemo(() => (
    (index?.paymentMethods || []).filter((method) => (
      method.room_key === selectedRoomKey &&
      method.deal_type === activeWalletDealType &&
      method.is_active
    ))
  ), [index, selectedRoomKey, activeWalletDealType])

  const walletPaymentMethods = useMemo(() => (
    walletRoomPaymentMethods.filter((method) => method.operation_type === 'Deposit')
  ), [walletRoomPaymentMethods])

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
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(''), 1400)
    } catch {
      setCopied('')
    }
  }

  const selectRoom = (roomKey: string) => {
    setSelectedRoomKey(roomKey)
    setSelectedCountryCode('')
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
            initialMode={mode === 'deals' ? 'deals' : 'methods'}
            initialRoomKey={selectedRoomKey}
            initialDealType={activeDealType}
            initialLanguage={language}
            onClose={(adminContext) => {
              setIsAdminOpen(false)
              if (adminContext?.roomKey) {
                setSelectedRoomKey(adminContext.roomKey)
                setSelectedCountryCode('')
                setSelectedDealType(adminContext.dealType)
                setLanguage(adminContext.language)
              }
              setRefreshToken((value) => value + 1)
            }}
          />
        </div>
      )}

      {!isAdminOpen && (
    <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Info size={28} className="text-blue-400" />
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
            <ModeButton active={mode === 'deals'} onClick={() => setMode('deals')}>Сделка</ModeButton>
            <ModeButton active={mode === 'wallets'} onClick={() => setMode('wallets')}>Кошельки</ModeButton>
          </div>
        </div>
        <div className="min-w-56">
          <label className="mb-1 block text-sm font-medium text-slate-400">Рум</label>
          <ComboboxField
            value={selectedRoomKey}
            options={roomOptions}
            onSelect={selectRoom}
            matches={matchesRoomOption}
            placeholder="Найти рум"
            emptyText="Румы не найдены"
          />
        </div>
        {mode === 'deals' && roomCountryOptions.length > 0 && (
          <div className="min-w-56">
            <label className="mb-1 block text-sm font-medium text-slate-400">Страна</label>
            <SelectField
              value={selectedCountryCode}
              options={[
                { value: '', label: 'Не выбрана' },
                ...roomCountryOptions.map((country) => ({ value: country.country_code, label: country.country_name })),
              ]}
              onChange={setSelectedCountryCode}
              ariaLabel="Страна"
            />
          </div>
        )}
        {mode === 'deals' && (
          <div className="min-w-44">
            <label className="mb-1 block text-sm font-medium text-slate-400">Тип сделки</label>
            <SelectField
              value={activeDealType}
              disabled={mode === 'deals' && (dealTypeChoices.length <= 1 || countryBlocksDeals)}
              options={dealTypeChoices.map((type) => ({ value: type, label: dealTypeLabels[type] }))}
              onChange={(value) => setSelectedDealType(value as RoomDealType)}
              ariaLabel="Тип сделки"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-400">Язык</label>
          <div className="flex rounded-xl bg-slate-950 p-1">
            {roomLanguageOptions.map((option) => (
              <ModeButton key={option} active={language === option} onClick={() => setLanguage(option)}>{option}</ModeButton>
            ))}
          </div>
        </div>
      </div>

      {mode === 'wallets' ? (
        <WalletsPanel
          roomTitle={roomName(index?.profiles || [], selectedRoomKey)}
          wallets={wallets}
          paymentMethods={walletPaymentMethods}
          hasConfiguredMethods={walletRoomPaymentMethods.length > 0}
          language={language}
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
  paymentMethods,
  hasConfiguredMethods,
  language,
  copied,
  onCopy,
}: {
  roomTitle: string
  wallets: RoomWalletInfo[]
  paymentMethods: RoomPaymentMethodInfo[]
  hasConfiguredMethods: boolean
  language: RoomLanguage
  copied: string
  onCopy: (key: string, text: string) => void
}) {
  const walletRows = wallets
    .filter((wallet) => wallet.is_active)
    .map((wallet) => ({
      wallet,
      method: findWalletDepositMethod(wallet, paymentMethods),
    }))
    .filter(({ method }) => !hasConfiguredMethods || method)
    .sort((left, right) => (
      ((left.method?.sort_order ?? left.wallet.sort_order) || 0) - ((right.method?.sort_order ?? right.wallet.sort_order) || 0) ||
      roomWalletDisplayTitle(left.wallet, left.method, language)
        .localeCompare(roomWalletDisplayTitle(right.wallet, right.method, language), undefined, { sensitivity: 'base' })
    ))
  const walletListText = walletRows.length
    ? [
        roomWalletListTitle(roomTitle, language),
        ...walletRows.map(({ wallet, method }) => roomWalletCopyText(wallet, method, language)),
      ].join('\n\n')
    : ''

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-100">Кошельки</h3>
          {walletRows.length > 0 && (
            <GhostIconCopyButton
              copied={copied === 'wallets-all'}
              label="Скопировать все кошельки"
              onClick={() => onCopy('wallets-all', walletListText)}
            />
          )}
        </div>
        {walletRows.length ? (
          <div className="space-y-2">
            {walletRows.map(({ wallet, method }) => (
              <div
                key={wallet.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100">
                    {roomWalletDisplayTitle(wallet, method, language)}
                  </div>
                  {method?.limits_text && <div className="mt-1 text-xs text-amber-200">{method.limits_text}</div>}
                  <div className="mt-2 break-all font-mono text-xs text-slate-300">{wallet.wallet_address}</div>
                </div>
                <GhostIconCopyButton
                  copied={copied === `wallet-${wallet.id}`}
                  label={`Скопировать ${wallet.currency} ${wallet.network}`}
                  onClick={() => onCopy(
                    `wallet-${wallet.id}`,
                    roomWalletCopyText(wallet, method, language)
                  )}
                />
              </div>
            ))}
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
