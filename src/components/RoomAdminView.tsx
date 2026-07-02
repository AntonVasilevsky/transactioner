import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ArrowLeft, Eye, EyeOff, GripVertical, Pencil, Plus, Save, Search, Settings, Trash2 } from 'lucide-react'
import { matchesRoomSearch } from '../utils/roomSearch'

type AdminMode = 'deals' | 'methods'
const allDealTypes: RoomDealType[] = ['Agent', 'Direct', 'General']
const pinnedRoomOrder = ['nexa', 'champion-poker', 'redstar']

const dealTypeLabels: Record<RoomDealType, string> = {
  General: 'Общая',
  Direct: 'Прямая',
  Agent: 'Агентская',
}
const roomLanguageOptions: RoomLanguage[] = ['RU', 'EN', 'ES']

const preferredDealTypeForRoom = (index: RoomKnowledgeIndex | null, roomKey: string): RoomDealType => {
  if (!index || !roomKey) return 'Agent'
  const existingTypes = Array.from(new Set([
    ...index.dealOptions.filter((deal) => deal.room_key === roomKey).map((deal) => deal.deal_type),
    ...index.walletOptions.filter((wallet) => wallet.room_key === roomKey).map((wallet) => wallet.deal_type),
  ]))
  return existingTypes.includes('Agent') ? 'Agent' : existingTypes[0] || 'Agent'
}

const roomName = (profiles: RoomProfileInfo[], roomKey: string) =>
  profiles.find((profile) => profile.room_key === roomKey)?.display_name || roomKey

const sortRooms = (profiles: RoomProfileInfo[]) => [...profiles].sort((left, right) => {
  const leftPinned = pinnedRoomOrder.indexOf(left.room_key)
  const rightPinned = pinnedRoomOrder.indexOf(right.room_key)
  const leftRank = leftPinned === -1 ? Number.POSITIVE_INFINITY : leftPinned
  const rightRank = rightPinned === -1 ? Number.POSITIVE_INFINITY : rightPinned

  if (leftRank !== rightRank) return leftRank - rightRank
  return left.display_name.localeCompare(right.display_name, undefined, { sensitivity: 'base' })
})

const emptyWallet = (roomKey: string, dealType: RoomDealType): SaveRoomWalletInput => ({
  room_key: roomKey,
  deal_type: dealType,
  currency: '',
  network: '',
  wallet_address: '',
  memo_tag: '',
  fee_text: '',
  note: '',
  verified_at: '',
  sort_order: 0,
  is_active: 1,
})

const emptyPaymentMethod = (roomKey: string, dealType: RoomDealType): SaveRoomPaymentMethodInput => ({
  room_key: roomKey,
  deal_type: dealType,
  operation_type: 'Deposit',
  method_name: '',
  currency: '',
  network: '',
  fee_text: '',
  limits_text: '',
  note: '',
  sort_order: 0,
  is_active: 1,
})

const walletFromMethod = (
  method: Pick<SaveRoomPaymentMethodInput, 'room_key' | 'deal_type' | 'currency' | 'network' | 'sort_order' | 'is_active'>
): SaveRoomWalletInput => ({
  room_key: method.room_key,
  deal_type: method.deal_type,
  currency: method.currency || '',
  network: method.network || '',
  wallet_address: '',
  memo_tag: '',
  fee_text: '',
  note: '',
  verified_at: '',
  sort_order: method.sort_order || 0,
  is_active: 1,
})

const normalizeAdminToken = (value?: string | null) => String(value || '').trim().toUpperCase()

const findWalletForMethod = (
  wallets: RoomWalletInfo[],
  method: Pick<SaveRoomPaymentMethodInput, 'currency' | 'network'>
) => {
  const currency = normalizeAdminToken(method.currency)
  const network = normalizeAdminToken(method.network)
  if (!currency || !network) return undefined
  const matchesMethod = (wallet: RoomWalletInfo) => (
    normalizeAdminToken(wallet.currency) === currency &&
    normalizeAdminToken(wallet.network) === network
  )
  return wallets.find((wallet) => wallet.is_active && matchesMethod(wallet)) ||
    wallets.find(matchesMethod)
}

const slugifyRoomKey = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const emptyDeal = (roomKey: string, dealType: RoomDealType, language: RoomLanguage): SaveRoomDealInput => ({
  room_key: roomKey,
  deal_type: dealType,
  language,
  short_text: '',
  full_text: '',
  registration_url: '',
  promo_code: '',
  registration_note: '',
  sort_order: 0,
  is_active: 1,
})

const dealDraftKey = (roomKey: string, dealType: RoomDealType, language: RoomLanguage) =>
  `${roomKey}|${dealType}|${language}`

const dealToForm = (deal: RoomDealInfo): SaveRoomDealInput => ({
  id: deal.id,
  room_key: deal.room_key,
  deal_type: deal.deal_type,
  language: deal.language,
  short_text: deal.short_text,
  full_text: deal.full_text,
  registration_url: deal.registration_url || '',
  promo_code: deal.promo_code || '',
  registration_note: deal.registration_note || '',
  sort_order: deal.sort_order || 0,
  is_active: deal.is_active,
  updated_at: deal.updated_at || '',
})

const walletToForm = (wallet: RoomWalletInfo): SaveRoomWalletInput => ({
  id: wallet.id,
  room_key: wallet.room_key,
  deal_type: wallet.deal_type,
  currency: wallet.currency,
  network: wallet.network,
  wallet_address: wallet.wallet_address,
  memo_tag: wallet.memo_tag || '',
  fee_text: wallet.fee_text || '',
  note: wallet.note || '',
  verified_at: wallet.verified_at || '',
  sort_order: wallet.sort_order || 0,
  is_active: wallet.is_active,
})

const paymentMethodToForm = (method: RoomPaymentMethodInfo): SaveRoomPaymentMethodInput => ({
  id: method.id,
  room_key: method.room_key,
  deal_type: method.deal_type,
  operation_type: method.operation_type,
  method_name: method.method_name,
  currency: method.currency || '',
  network: method.network || '',
  fee_text: method.fee_text || '',
  limits_text: method.limits_text || '',
  note: method.note || '',
  sort_order: method.sort_order || 0,
  is_active: method.is_active,
})

const hasPaymentMethodDraftContent = (method: SaveRoomPaymentMethodInput) => [
  method.method_name,
  method.currency,
  method.network,
  method.fee_text,
  method.limits_text,
  method.note,
].some((value) => String(value || '').trim())

const hasDealDraftContent = (deal: SaveRoomDealInput) => [
  deal.short_text,
  deal.full_text,
  deal.registration_url,
  deal.promo_code,
  deal.registration_note,
].some((value) => String(value || '').trim())

const isDealDraftComplete = (deal: SaveRoomDealInput) =>
  Boolean(String(deal.short_text || '').trim() && String(deal.full_text || '').trim())

const preservePageScrollAfterPaste = () => {
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  window.setTimeout(() => window.scrollTo(scrollX, scrollY), 0)
}

export default function RoomAdminView({
  initialMode = 'deals',
  initialRoomKey = '',
  initialDealType,
  initialLanguage = 'RU',
  onClose,
}: {
  initialMode?: AdminMode
  initialRoomKey?: string
  initialDealType?: RoomDealType
  initialLanguage?: RoomLanguage
  onClose: (context?: { roomKey: string, dealType: RoomDealType, language: RoomLanguage }) => void
}) {
  const [mode, setMode] = useState<AdminMode>(initialMode)
  const [index, setIndex] = useState<RoomKnowledgeIndex | null>(null)
  const [roomKey, setRoomKey] = useState('')
  const [roomQuery, setRoomQuery] = useState('')
  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false)
  const [dealType, setDealType] = useState<RoomDealType>(initialDealType || 'Agent')
  const [language, setLanguage] = useState<RoomLanguage>(initialLanguage)
  const [deals, setDeals] = useState<RoomDealInfo[]>([])
  const [wallets, setWallets] = useState<RoomWalletInfo[]>([])
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [roomForm, setRoomForm] = useState<SaveRoomProfileInput>({
    room_key: '',
    display_name: '',
    network_name: '',
    notes: '',
    is_active: 1,
  })
  const [dealForm, setDealForm] = useState<SaveRoomDealInput | null>(null)
  const [walletForm, setWalletForm] = useState<SaveRoomWalletInput | null>(null)
  const [paymentMethodForm, setPaymentMethodForm] = useState<SaveRoomPaymentMethodInput | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const pageTopRef = useRef<HTMLDivElement | null>(null)
  const dealDraftsRef = useRef<Record<string, SaveRoomDealInput>>({})
  const initialContextRef = useRef({
    dealType: initialDealType,
    roomKey: initialRoomKey
  })

  const focusPageTop = () => {
    window.requestAnimationFrame(() => {
      pageTopRef.current?.scrollIntoView({ block: 'start' })
      pageTopRef.current?.focus({ preventScroll: true })
    })
  }

  const closeWithCurrentContext = () => {
    onClose({ roomKey, dealType, language })
  }

  const loadIndex = async (preferredRoomKey?: string) => {
    const nextIndex = await window.electronAPI.getRoomKnowledgeAdminIndex()
    const sortedProfiles = sortRooms(nextIndex.profiles)
    const initialContext = initialContextRef.current
    const nextRoomKey = preferredRoomKey || roomKey || initialContext.roomKey || sortedProfiles[0]?.room_key || ''
    const nextDealType = roomKey || preferredRoomKey || nextRoomKey !== initialContext.roomKey || !initialContext.dealType
      ? preferredDealTypeForRoom(nextIndex, nextRoomKey)
      : initialContext.dealType
    setIndex(nextIndex)
    setRoomKey(nextRoomKey)
    setDealType(nextDealType)
    setRoomQuery(roomName(nextIndex.profiles, nextRoomKey))
  }

  useEffect(() => {
    let active = true
    window.electronAPI.getRoomKnowledgeAdminIndex()
      .then((nextIndex) => {
        if (!active) return
        const sortedProfiles = sortRooms(nextIndex.profiles)
        const initialContext = initialContextRef.current
        const nextRoomKey = initialContext.roomKey || sortedProfiles[0]?.room_key || ''
        const nextDealType = initialContext.dealType && nextRoomKey === initialContext.roomKey
          ? initialContext.dealType
          : preferredDealTypeForRoom(nextIndex, nextRoomKey)
        setIndex(nextIndex)
        setRoomKey(nextRoomKey)
        setRoomQuery(roomName(nextIndex.profiles, nextRoomKey))
        setDealType(nextDealType)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      active = false
    }
  }, [])

  const dealTypes = useMemo(() => {
    if (!index || !roomKey) return ['General'] as RoomDealType[]
    const existingValues = Array.from(new Set([
      ...index.dealOptions.filter((deal) => deal.room_key === roomKey).map((deal) => deal.deal_type),
      ...index.walletOptions.filter((wallet) => wallet.room_key === roomKey).map((wallet) => wallet.deal_type),
      ...index.paymentMethods.filter((method) => method.room_key === roomKey).map((method) => method.deal_type),
    ]))
    const values = [...existingValues, ...allDealTypes]
    return Array.from(new Set(values))
  }, [index, roomKey])

  const existingDealTypes = useMemo(() => {
    if (!index || !roomKey) return [] as RoomDealType[]
    return Array.from(new Set([
      ...index.dealOptions.filter((deal) => deal.room_key === roomKey).map((deal) => deal.deal_type),
      ...index.walletOptions.filter((wallet) => wallet.room_key === roomKey).map((wallet) => wallet.deal_type),
      ...index.paymentMethods.filter((method) => method.room_key === roomKey).map((method) => method.deal_type),
    ]))
  }, [index, roomKey])

  const activeDealType = dealTypes.includes(dealType)
    ? dealType
    : existingDealTypes.includes('Agent')
      ? 'Agent'
      : existingDealTypes[0] || 'Agent'
  const activeMethodDealType = existingDealTypes.includes('Agent') ? 'Agent' : activeDealType

  const filteredRoomProfiles = useMemo(() => {
    const profiles = index?.profiles || []
    const selectedRoomName = roomName(profiles, roomKey)
    const rawQuery = roomQuery.trim()
    const query = rawQuery && rawQuery !== selectedRoomName
      ? rawQuery.toLowerCase()
      : ''
    const filteredProfiles = query
      ? profiles.filter((profile) => matchesRoomSearch([profile.display_name, profile.room_key, profile.network_name], query))
      : profiles
    return sortRooms(filteredProfiles)
  }, [index, roomKey, roomQuery])

  useEffect(() => {
    if (!roomKey) return
    let active = true
    window.electronAPI.getRoomDeals(roomKey, language, activeDealType)
      .then((result) => {
        if (!active) return
        const draft = dealDraftsRef.current[dealDraftKey(roomKey, activeDealType, language)]
        setDeals(result)
        setDealForm(draft || (result[0] ? dealToForm(result[0]) : emptyDeal(roomKey, activeDealType, language)))
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    return () => {
      active = false
    }
  }, [roomKey, activeDealType, language])

  useEffect(() => {
    if (!roomKey) return
    let active = true
    const walletDealType = existingDealTypes.includes('Agent') ? 'Agent' : activeDealType
    window.electronAPI.getRoomWallets(roomKey, walletDealType)
      .then((result) => {
        if (!active) return
        setWallets(result)
        setWalletForm(result[0] ? walletToForm(result[0]) : emptyWallet(roomKey, walletDealType))
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
    return () => {
      active = false
    }
  }, [roomKey, activeDealType, existingDealTypes])

  const paymentMethods = useMemo(() => {
    if (!roomKey || !index) return [] as RoomPaymentMethodInfo[]
    return index.paymentMethods
      .filter((method) => method.room_key === roomKey && method.deal_type === activeMethodDealType)
      .sort((left, right) => (
        (left.sort_order || 0) - (right.sort_order || 0) ||
        left.operation_type.localeCompare(right.operation_type) ||
        left.method_name.localeCompare(right.method_name, undefined, { sensitivity: 'base' })
      ))
  }, [index, roomKey, activeMethodDealType])

  useEffect(() => {
    if (mode !== 'methods' || !roomKey) return
    const frame = window.requestAnimationFrame(() => {
      const formMatchesRoom = paymentMethodForm &&
        paymentMethodForm.room_key === roomKey &&
        paymentMethodForm.deal_type === activeMethodDealType
      const nextForm = formMatchesRoom
        ? paymentMethodForm
        : paymentMethods[0]
          ? paymentMethodToForm(paymentMethods[0])
          : emptyPaymentMethod(roomKey, activeMethodDealType)
      if (!formMatchesRoom) setPaymentMethodForm(nextForm)

      const matchedWallet = findWalletForMethod(wallets, nextForm)
      const walletMatchesMethod = walletForm &&
        walletForm.room_key === nextForm.room_key &&
        walletForm.deal_type === nextForm.deal_type &&
        normalizeAdminToken(walletForm.currency) === normalizeAdminToken(nextForm.currency) &&
        normalizeAdminToken(walletForm.network) === normalizeAdminToken(nextForm.network)
      if (!walletMatchesMethod) {
        setWalletForm(matchedWallet ? walletToForm(matchedWallet) : walletFromMethod(nextForm))
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [mode, roomKey, activeMethodDealType, paymentMethods, wallets, paymentMethodForm, walletForm])

  const selectedRoomName = roomName(index?.profiles || [], roomKey)
  const selectedRoomProfile = index?.profiles.find((profile) => profile.room_key === roomKey)

  const showMessage = (text: string) => {
    setError('')
    setMessage(text)
    window.setTimeout(() => setMessage(''), 1800)
  }

  const updateDealForm = (nextDealForm: SaveRoomDealInput) => {
    dealDraftsRef.current[dealDraftKey(nextDealForm.room_key, nextDealForm.deal_type, nextDealForm.language)] = nextDealForm
    setDealForm(nextDealForm)
  }

  const selectRoom = (profile: RoomProfileInfo) => {
    setRoomKey(profile.room_key)
    setDealType(preferredDealTypeForRoom(index, profile.room_key))
    setRoomQuery(profile.display_name)
    setIsRoomPickerOpen(false)
  }

  const saveDeal = async () => {
    if (!dealForm) return

    const draftsToSave = new Map<string, SaveRoomDealInput>()
    Object.values(dealDraftsRef.current)
      .filter((draft) => (
        draft.room_key === dealForm.room_key &&
        draft.deal_type === dealForm.deal_type &&
        hasDealDraftContent(draft)
      ))
      .forEach((draft) => {
        draftsToSave.set(dealDraftKey(draft.room_key, draft.deal_type, draft.language), draft)
      })

    if (hasDealDraftContent(dealForm) || draftsToSave.size === 0) {
      draftsToSave.set(dealDraftKey(dealForm.room_key, dealForm.deal_type, dealForm.language), dealForm)
    }

    const incompleteDraft = Array.from(draftsToSave.values()).find((draft) => !isDealDraftComplete(draft))
    if (incompleteDraft) {
      setMessage('')
      setError(`Заполните короткую сделку и полные условия для ${incompleteDraft.language}`)
      return
    }

    for (const draft of draftsToSave.values()) {
      const result = await window.electronAPI.saveRoomDeal(draft)
      if (!result.success) {
        setMessage('')
        setError(result.error ? `${draft.language}: ${result.error}` : `Не удалось сохранить сделку ${draft.language}`)
        return
      }
    }

    const savedCount = draftsToSave.size
    showMessage(savedCount > 1 ? `Сделки сохранены: ${savedCount}` : 'Сделка сохранена')
    await loadIndex()

    for (const draft of draftsToSave.values()) {
      delete dealDraftsRef.current[dealDraftKey(draft.room_key, draft.deal_type, draft.language)]
    }

    const nextDeals = await window.electronAPI.getRoomDeals(dealForm.room_key, dealForm.language, dealForm.deal_type)
    const nextDealForm = nextDeals[0] ? dealToForm(nextDeals[0]) : dealForm
    setDeals(nextDeals)
    setDealForm(nextDealForm)
    focusPageTop()
  }

  const startAddRoom = () => {
    setRoomForm({
      room_key: '',
      display_name: '',
      network_name: '',
      notes: '',
      is_active: 1,
    })
    setIsAddingRoom(true)
    setMessage('')
    setError('')
  }

  const saveRoom = async () => {
    const normalizedRoomKey = slugifyRoomKey(roomForm.room_key || roomForm.display_name)
    const result = await window.electronAPI.saveRoomProfile({
      ...roomForm,
      room_key: normalizedRoomKey,
    })
    if (!result.success) {
      setMessage('')
      setError(result.error || 'Не удалось сохранить рум')
      return
    }
    showMessage('Рум добавлен')
    setIsAddingRoom(false)
    await loadIndex(normalizedRoomKey)
    setRoomKey(normalizedRoomKey)
    setMode('deals')
    setDealType('Direct')
    setLanguage('RU')
    setDealForm(emptyDeal(normalizedRoomKey, 'Direct', 'RU'))
    setWalletForm(emptyWallet(normalizedRoomKey, 'Direct'))
    setPaymentMethodForm(emptyPaymentMethod(normalizedRoomKey, 'Direct'))
  }

  const updateSelectedRoomActive = async (isActive: boolean) => {
    if (!selectedRoomProfile) return
    const result = await window.electronAPI.saveRoomProfile({
      id: selectedRoomProfile.id,
      room_key: selectedRoomProfile.room_key,
      display_name: selectedRoomProfile.display_name,
      network_name: selectedRoomProfile.network_name || '',
      notes: selectedRoomProfile.notes || '',
      is_active: isActive ? 1 : 0,
    })
    if (!result.success) {
      setMessage('')
      setError(result.error || 'Не удалось обновить рум')
      return
    }
    showMessage(isActive ? 'Рум включен в инфо' : 'Рум скрыт из инфо')
    await loadIndex(selectedRoomProfile.room_key)
  }

  const deleteWallet = async (walletId = walletForm?.id) => {
    if (!walletId) return
    const targetRoomKey = walletForm?.room_key || roomKey
    const targetDealType = walletForm?.deal_type || activeMethodDealType
    const confirmed = window.confirm('Удалить этот кошелек? Это действие нельзя отменить.')
    if (!confirmed) return
    const result = await window.electronAPI.deleteRoomWallet(walletId)
    if (!result.success) {
      setMessage('')
      setError(result.error || 'Не удалось удалить кошелек')
      return
    }
    showMessage('Кошелек удален')
    await loadIndex()
    const nextWallets = await window.electronAPI.getRoomWallets(targetRoomKey, targetDealType)
    setWallets(nextWallets)
    const preservedCurrent = walletForm?.id && walletForm.id !== walletId
      ? nextWallets.find((wallet) => wallet.id === walletForm.id)
      : null
    setWalletForm(preservedCurrent
      ? walletToForm(preservedCurrent)
      : nextWallets[0]
        ? walletToForm(nextWallets[0])
        : emptyWallet(targetRoomKey, targetDealType)
    )
  }

  const savePaymentMethod = async () => {
    if (!paymentMethodForm) return
    const previousMethod = paymentMethodForm.id
      ? index?.paymentMethods.find((method) => method.id === paymentMethodForm.id)
      : undefined
    const previousWallet = previousMethod?.operation_type === 'Deposit'
      ? findWalletForMethod(wallets, previousMethod)
      : undefined
    const methodLabel = [paymentMethodForm.currency, paymentMethodForm.network]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ')
    const methodPayload = {
      ...paymentMethodForm,
      method_name: methodLabel || paymentMethodForm.method_name,
    }
    const result = await window.electronAPI.saveRoomPaymentMethod(methodPayload)
    if (!result.success) {
      setMessage('')
      setError(result.error || 'Не удалось сохранить метод')
      return
    }

    if (methodPayload.operation_type === 'Deposit') {
      const walletMatchesMethod = walletForm &&
        walletForm.room_key === methodPayload.room_key &&
        walletForm.deal_type === methodPayload.deal_type &&
        normalizeAdminToken(walletForm.currency) === normalizeAdminToken(methodPayload.currency) &&
        normalizeAdminToken(walletForm.network) === normalizeAdminToken(methodPayload.network)
      const walletPayload = walletMatchesMethod ? walletForm : walletFromMethod(methodPayload)
      const walletAddress = String(walletPayload.wallet_address || '').trim()
      if (walletAddress) {
        const walletResult = await window.electronAPI.saveRoomWallet({
          ...walletPayload,
          room_key: methodPayload.room_key,
          deal_type: methodPayload.deal_type,
          currency: methodPayload.currency || '',
          network: methodPayload.network || '',
          wallet_address: walletAddress,
          is_active: walletPayload.is_active ?? 1,
          sort_order: methodPayload.sort_order,
        })
        if (!walletResult.success) {
          setMessage('')
          setError(walletResult.error || 'Метод сохранен, но кошелек сохранить не удалось')
          return
        }
      } else if (walletPayload.id) {
        const deleteResult = await window.electronAPI.deleteRoomWallet(walletPayload.id)
        if (!deleteResult.success) {
          setMessage('')
          setError(deleteResult.error || 'Метод сохранен, но пустой кошелек удалить не удалось')
          return
        }
      }
    } else if (previousWallet?.id) {
      const deleteResult = await window.electronAPI.deleteRoomWallet(previousWallet.id)
      if (!deleteResult.success) {
        setMessage('')
        setError(deleteResult.error || 'Метод сохранен, но связанный кошелек удалить не удалось')
        return
      }
    }

    showMessage(methodPayload.operation_type === 'Deposit' ? 'Метод и кошелек сохранены' : 'Метод сохранен')
    const nextIndex = await window.electronAPI.getRoomKnowledgeAdminIndex()
    const nextWallets = await window.electronAPI.getRoomWallets(methodPayload.room_key, methodPayload.deal_type)
    const nextMethods = nextIndex.paymentMethods
      .filter((method) => method.room_key === methodPayload.room_key && method.deal_type === methodPayload.deal_type)
      .sort((left, right) => (
        (left.sort_order || 0) - (right.sort_order || 0) ||
        left.operation_type.localeCompare(right.operation_type) ||
        left.method_name.localeCompare(right.method_name, undefined, { sensitivity: 'base' })
      ))
    setIndex(nextIndex)
    setWallets(nextWallets)
    const saved = result.id ? nextMethods.find((method) => method.id === result.id) : nextMethods[0]
    const savedForm = saved ? paymentMethodToForm(saved) : methodPayload
    setPaymentMethodForm(savedForm)
    const savedWallet = findWalletForMethod(nextWallets, savedForm)
    setWalletForm(savedWallet ? walletToForm(savedWallet) : walletFromMethod(savedForm))
  }

  const deletePaymentMethod = async (methodId = paymentMethodForm?.id) => {
    if (!methodId) return
    const methodToDelete = index?.paymentMethods.find((method) => method.id === methodId)
    const linkedWallet = methodToDelete?.operation_type === 'Deposit'
      ? findWalletForMethod(wallets, methodToDelete)
      : undefined
    const targetRoomKey = paymentMethodForm?.room_key || roomKey
    const targetDealType = paymentMethodForm?.deal_type || activeMethodDealType
    const confirmed = window.confirm('Удалить этот метод? Это действие нельзя отменить.')
    if (!confirmed) return
    const result = await window.electronAPI.deleteRoomPaymentMethod(methodId)
    if (!result.success) {
      setMessage('')
      setError(result.error || 'Не удалось удалить метод')
      return
    }
    if (linkedWallet?.id) {
      const deleteWalletResult = await window.electronAPI.deleteRoomWallet(linkedWallet.id)
      if (!deleteWalletResult.success) {
        setMessage('')
        setError(deleteWalletResult.error || 'Метод удален, но связанный кошелек удалить не удалось')
        return
      }
    }
    showMessage('Метод удален')
    const nextIndex = await window.electronAPI.getRoomKnowledgeAdminIndex()
    const nextWallets = await window.electronAPI.getRoomWallets(targetRoomKey, targetDealType)
    const nextMethods = nextIndex.paymentMethods
      .filter((method) => method.room_key === targetRoomKey && method.deal_type === targetDealType)
      .sort((left, right) => (
        (left.sort_order || 0) - (right.sort_order || 0) ||
        left.operation_type.localeCompare(right.operation_type) ||
        left.method_name.localeCompare(right.method_name, undefined, { sensitivity: 'base' })
    ))
    setIndex(nextIndex)
    setWallets(nextWallets)
    const preservedCurrent = paymentMethodForm?.id && paymentMethodForm.id !== methodId
      ? nextMethods.find((method) => method.id === paymentMethodForm.id)
      : null
    const nextForm = preservedCurrent
      ? paymentMethodToForm(preservedCurrent)
      : nextMethods[0]
        ? paymentMethodToForm(nextMethods[0])
        : emptyPaymentMethod(targetRoomKey, targetDealType)
    setPaymentMethodForm(nextForm)
    const nextWallet = findWalletForMethod(nextWallets, nextForm)
    setWalletForm(nextWallet ? walletToForm(nextWallet) : walletFromMethod(nextForm))
  }

  const reorderPaymentMethods = async (orderedMethods: RoomPaymentMethodInfo[]) => {
    if (!orderedMethods.length || !index) return
    const reorderedMethods = orderedMethods.map((method, index) => ({
      ...method,
      sort_order: (index + 1) * 10,
    }))
    setIndex({
      ...index,
      paymentMethods: index.paymentMethods.map((method) => (
        method.room_key === roomKey && method.deal_type === activeMethodDealType
          ? reorderedMethods.find((ordered) => ordered.id === method.id) || method
          : method
      )),
    })

    for (const method of reorderedMethods) {
      const methodResult = await window.electronAPI.saveRoomPaymentMethod({
        ...paymentMethodToForm(method),
        sort_order_only: true,
      })
      if (!methodResult.success) {
        setMessage('')
        setError(methodResult.error || 'Не удалось сохранить порядок методов')
        return
      }

      if (method.operation_type === 'Deposit') {
        const linkedWallet = findWalletForMethod(wallets, method)
        if (linkedWallet) {
          const walletResult = await window.electronAPI.saveRoomWallet({
            ...walletToForm(linkedWallet),
            sort_order: method.sort_order,
            sort_order_only: true,
          })
          if (!walletResult.success) {
            setMessage('')
            setError(walletResult.error || 'Порядок методов сохранен, но порядок кошелька обновить не удалось')
            return
          }
        }
      }
    }

    const nextIndex = await window.electronAPI.getRoomKnowledgeAdminIndex()
    const nextWallets = await window.electronAPI.getRoomWallets(roomKey, activeMethodDealType)
    setIndex(nextIndex)
    setWallets(nextWallets)
    if (paymentMethodForm?.id) {
      const currentMethod = nextIndex.paymentMethods.find((method) => method.id === paymentMethodForm.id)
      if (currentMethod) setPaymentMethodForm(paymentMethodToForm(currentMethod))
    }
    showMessage('Порядок сохранен')
  }

  return (
    <div ref={pageTopRef} tabIndex={-1} className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 outline-none duration-500">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Settings size={28} className="text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Редактирование румов</h2>
            <p className="text-sm text-slate-500">Перед сохранением создается backup базы.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeWithCurrentContext}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-blue-500 hover:text-slate-100"
        >
          <ArrowLeft size={15} />
          Назад
        </button>
      </div>

      {isAddingRoom && (
        <section className="mb-5 rounded-xl border border-blue-500/40 bg-blue-500/10 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-100">Новый рум</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddingRoom(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                Отмена
              </button>
              <SaveButton onClick={saveRoom} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Название рума">
              <input
                value={roomForm.display_name}
                onChange={(event) => {
                  const displayName = event.target.value
                  setRoomForm({
                    ...roomForm,
                    display_name: displayName,
                    room_key: roomForm.room_key && roomForm.room_key !== slugifyRoomKey(roomForm.display_name)
                      ? roomForm.room_key
                      : slugifyRoomKey(displayName),
                  })
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
              />
            </Field>
            <Field label="Ключ рума">
              <input
                value={roomForm.room_key}
                onChange={(event) => setRoomForm({ ...roomForm, room_key: slugifyRoomKey(event.target.value) })}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
              />
            </Field>
            <Field label="Сеть / бренд">
              <input
                value={roomForm.network_name || ''}
                onChange={(event) => setRoomForm({ ...roomForm, network_name: event.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
              />
            </Field>
            <Field label="Заметка">
              <input
                value={roomForm.notes || ''}
                onChange={(event) => setRoomForm({ ...roomForm, notes: event.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
              />
            </Field>
            <Field label="Видимость">
              <RoomVisibilityButton
                active={Boolean(roomForm.is_active)}
                onClick={() => setRoomForm({ ...roomForm, is_active: roomForm.is_active ? 0 : 1 })}
              />
            </Field>
          </div>
        </section>
      )}

      {(message || error) && (
        <div className={`fixed right-8 top-8 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${error ? 'border-red-500/40 bg-red-950/90 text-red-100 shadow-red-950/30' : 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100 shadow-emerald-950/30'}`}>
          {error || message}
        </div>
      )}

      {!isAddingRoom && (
        <>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-400">Раздел</label>
          <div className="flex rounded-xl bg-slate-950 p-1">
            <ModeButton active={mode === 'deals'} onClick={() => setMode('deals')}>Сделки</ModeButton>
            <ModeButton active={mode === 'methods'} onClick={() => setMode('methods')}>Методы</ModeButton>
          </div>
        </div>
        <div className="relative min-w-56">
          <label className="mb-1 block text-sm font-medium text-slate-400">Рум</label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
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
                onClick={(event) => event.currentTarget.select()}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsRoomPickerOpen(false)
                    setRoomQuery(roomName(index?.profiles || [], roomKey))
                  }, 120)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && filteredRoomProfiles[0]) {
                    event.preventDefault()
                    selectRoom(filteredRoomProfiles[0])
                  }
                  if (event.key === 'Escape') {
                    setIsRoomPickerOpen(false)
                    setRoomQuery(roomName(index?.profiles || [], roomKey))
                  }
                }}
                placeholder="Найти рум"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-3 text-slate-100 outline-none focus:border-blue-500"
              />
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
                          profile.room_key === roomKey
                            ? 'bg-blue-600/20 text-blue-200'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{profile.display_name}</span>
                          {!profile.is_active && <EyeOff size={14} className="shrink-0 text-slate-500" />}
                        </div>
                        {profile.network_name && <div className="text-xs text-slate-500">{profile.network_name}</div>}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-slate-500">Румы не найдены</div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={startAddRoom}
              title="Добавить рум"
              aria-label="Добавить рум"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-blue-500 hover:text-white"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        {selectedRoomProfile && (
          <RoomVisibilityButton
            active={Boolean(selectedRoomProfile.is_active)}
            onClick={() => updateSelectedRoomActive(!selectedRoomProfile.is_active)}
          />
        )}
        <div className="min-w-44">
          <label className="mb-1 block text-sm font-medium text-slate-400">Тип сделки</label>
          <select
            value={activeDealType}
            onChange={(event) => setDealType(event.target.value as RoomDealType)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
          >
            {dealTypes.map((type) => (
              <option key={type} value={type}>{dealTypeLabels[type]}</option>
            ))}
          </select>
        </div>
        {mode === 'deals' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Язык</label>
            <div className="flex rounded-xl bg-slate-950 p-1">
              {roomLanguageOptions.map((option) => (
                <ModeButton key={option} active={language === option} onClick={() => setLanguage(option)}>{option}</ModeButton>
              ))}
            </div>
          </div>
        )}
      </div>

      {mode === 'deals' ? (
        <DealEditor
          dealForm={dealForm}
          deals={deals}
          roomName={selectedRoomName}
          onChange={updateDealForm}
          onSave={saveDeal}
        />
      ) : mode === 'methods' ? (
        <PaymentMethodEditor
          methodForm={paymentMethodForm}
          methods={paymentMethods}
          wallets={wallets}
          walletForm={walletForm}
          roomKey={roomKey}
          dealType={activeMethodDealType}
          onChange={setPaymentMethodForm}
          onWalletChange={setWalletForm}
          onSave={savePaymentMethod}
          onDelete={deletePaymentMethod}
          onDeleteWallet={deleteWallet}
          onReorder={reorderPaymentMethods}
        />
      ) : (
        null
      )}
        </>
      )}
    </div>
  )
}

function DealEditor({
  dealForm,
  deals,
  roomName,
  onChange,
  onSave,
}: {
  dealForm: SaveRoomDealInput | null
  deals: RoomDealInfo[]
  roomName: string
  onChange: (value: SaveRoomDealInput) => void
  onSave: () => void
}) {
  if (!dealForm) {
    return (
      <section className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
        <div className="text-sm text-slate-400">Для {roomName} нет сделки в выбранной комбинации.</div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-100">{roomName}: {dealTypeLabels[dealForm.deal_type]}</h3>
        <SaveButton onClick={onSave} />
      </div>
      {deals.length > 1 && (
        <div className="mb-4 text-sm text-amber-200">Найдено несколько сделок. Сейчас редактируется первая по сортировке.</div>
      )}
      <div className="space-y-4">
        <Field label="Короткая сделка">
          <textarea
            value={dealForm.short_text}
            onChange={(event) => onChange({ ...dealForm, short_text: event.target.value })}
            onPaste={preservePageScrollAfterPaste}
            rows={4}
            className="min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm leading-6 text-slate-100 outline-none focus:border-blue-500"
          />
        </Field>
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <span className="block text-sm font-medium text-slate-400">Полные условия</span>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(dealForm.is_active)}
                onChange={(event) => onChange({ ...dealForm, is_active: event.target.checked ? 1 : 0 })}
                className="h-4 w-4"
              />
              Активна
            </label>
          </div>
          <textarea
            value={dealForm.full_text}
            onChange={(event) => onChange({ ...dealForm, full_text: event.target.value })}
            onPaste={preservePageScrollAfterPaste}
            rows={16}
            className="min-h-96 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm leading-6 text-slate-100 outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </section>
  )
}

function PaymentMethodEditor({
  methodForm,
  methods,
  wallets,
  walletForm,
  roomKey,
  dealType,
  onChange,
  onWalletChange,
  onSave,
  onDelete,
  onDeleteWallet,
  onReorder,
}: {
  methodForm: SaveRoomPaymentMethodInput | null
  methods: RoomPaymentMethodInfo[]
  wallets: RoomWalletInfo[]
  walletForm: SaveRoomWalletInput | null
  roomKey: string
  dealType: RoomDealType
  onChange: (value: SaveRoomPaymentMethodInput) => void
  onWalletChange: (value: SaveRoomWalletInput) => void
  onSave: () => void
  onDelete: (methodId?: number) => void
  onDeleteWallet: (walletId?: number) => void
  onReorder: (orderedMethods: RoomPaymentMethodInfo[]) => void
}) {
  const formSectionRef = useRef<HTMLElement | null>(null)
  const [draggingMethodId, setDraggingMethodId] = useState<number | null>(null)
  const currentForm = methodForm && methodForm.room_key === roomKey && methodForm.deal_type === dealType
    ? methodForm
    : methods[0]
      ? paymentMethodToForm(methods[0])
      : emptyPaymentMethod(roomKey, dealType)
  const isNewMethod = !currentForm.id
  const showNewButton = !isNewMethod || hasPaymentMethodDraftContent(currentForm)
  const linkedWallet = findWalletForMethod(wallets, currentForm)
  const walletFormMatchesMethod = walletForm &&
    walletForm.room_key === roomKey &&
    walletForm.deal_type === dealType &&
    normalizeAdminToken(walletForm.currency) === normalizeAdminToken(currentForm.currency) &&
    normalizeAdminToken(walletForm.network) === normalizeAdminToken(currentForm.network)
  const currentWalletForm = walletFormMatchesMethod
    ? walletForm
    : linkedWallet
      ? walletToForm(linkedWallet)
      : walletFromMethod(currentForm)
  const scrollToForm = () => {
    window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
  const createMethod = () => {
    const nextMethod = emptyPaymentMethod(roomKey, dealType)
    onChange(nextMethod)
    onWalletChange(walletFromMethod(nextMethod))
    scrollToForm()
  }
  const editMethod = (method: RoomPaymentMethodInfo) => {
    const nextMethod = paymentMethodToForm(method)
    const nextWallet = findWalletForMethod(wallets, nextMethod)
    onChange(nextMethod)
    onWalletChange(nextWallet ? walletToForm(nextWallet) : walletFromMethod(nextMethod))
    scrollToForm()
  }
  const updateMethodIdentity = (updates: Partial<SaveRoomPaymentMethodInput>) => {
    const nextMethod = { ...currentForm, ...updates }
    onChange(nextMethod)
    if (nextMethod.operation_type === 'Deposit') {
      onWalletChange({
        ...currentWalletForm,
        room_key: nextMethod.room_key,
        deal_type: nextMethod.deal_type,
        currency: nextMethod.currency || '',
        network: nextMethod.network || '',
        sort_order: nextMethod.sort_order,
      })
    }
  }
  const updateWallet = (updates: Partial<SaveRoomWalletInput>) => {
    onWalletChange({
      ...currentWalletForm,
      room_key: currentForm.room_key,
      deal_type: currentForm.deal_type,
      currency: currentForm.currency || '',
      network: currentForm.network || '',
      is_active: currentWalletForm.is_active ?? 1,
      sort_order: currentForm.sort_order,
      ...updates,
    })
  }
  const dropMethodOn = (targetMethod: RoomPaymentMethodInfo) => {
    if (!draggingMethodId || draggingMethodId === targetMethod.id) return
    const draggedMethod = methods.find((method) => method.id === draggingMethodId)
    if (!draggedMethod) return
    const draggedIndex = methods.findIndex((method) => method.id === draggingMethodId)
    const targetIndexInFullList = methods.findIndex((method) => method.id === targetMethod.id)
    const withoutDragged = methods.filter((method) => method.id !== draggingMethodId)
    const targetIndex = withoutDragged.findIndex((method) => method.id === targetMethod.id)
    if (targetIndex === -1) return
    const insertIndex = draggedIndex < targetIndexInFullList ? targetIndex + 1 : targetIndex
    const reordered = [
      ...withoutDragged.slice(0, insertIndex),
      draggedMethod,
      ...withoutDragged.slice(insertIndex),
    ]
    onReorder(reordered)
  }
  const allowDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <section className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-100">Методы и лимиты</h3>
          {showNewButton && (
            <button
              type="button"
              onClick={createMethod}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-blue-500 hover:text-slate-100"
            >
              <Plus size={15} />
              {isNewMethod ? 'Очистить' : 'Новый'}
            </button>
          )}
        </div>
        {methods.length ? (
          <div className="space-y-2">
            {methods.map((method) => (
              <div
                key={method.id}
                onDragOver={allowDrop}
                onDrop={(event) => {
                  event.preventDefault()
                  dropMethodOn(method)
                  setDraggingMethodId(null)
                }}
                onDragEnd={() => setDraggingMethodId(null)}
                className={`group relative rounded-lg border pl-11 pr-24 transition-colors ${
                  draggingMethodId === method.id
                    ? 'border-blue-400/70 bg-blue-500/20 opacity-80'
                    :
                  method.id === currentForm.id
                    ? 'border-blue-500/60 bg-blue-500/10'
                    : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600'
                }`}
              >
                <div
                  draggable
                  onDragStart={(event) => {
                    setDraggingMethodId(method.id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', String(method.id))
                  }}
                  title="Перетащить"
                  aria-label="Перетащить метод"
                  className="absolute left-3 top-1/2 flex h-9 w-7 -translate-y-1/2 cursor-grab items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 active:cursor-grabbing"
                >
                  <GripVertical size={17} />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(paymentMethodToForm(method))}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-100">
                      {method.operation_type === 'Deposit' ? 'Депозит' : 'Вывод'} · {method.currency || method.method_name} {method.network}
                    </div>
                    {!method.is_active && <span className="text-xs text-slate-500">неактивен</span>}
                  </div>
                  {method.limits_text && <div className="mt-1 text-xs text-amber-200">{method.limits_text}</div>}
                  {method.fee_text && <div className="mt-1 text-xs text-slate-500">{method.fee_text}</div>}
                </button>
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => editMethod(method)}
                    title="Редактировать метод"
                    aria-label="Редактировать метод"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-950/80 text-slate-300 transition-colors hover:border-blue-500 hover:text-blue-200"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(method.id)}
                    title="Удалить метод"
                    aria-label="Удалить метод"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/40 bg-slate-950/80 text-rose-300 transition-colors hover:bg-rose-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
            Методы пока не заполнены.
          </div>
        )}
      </section>

      <section ref={formSectionRef} className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-100">{currentForm.id ? 'Редактировать' : 'Новый метод'}</h3>
          <div className="flex items-center gap-2">
            {currentForm.id && (
              <button
                type="button"
                onClick={() => onDelete()}
                title="Удалить метод"
                aria-label="Удалить метод"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/40 text-rose-300 transition-colors hover:bg-rose-500/10"
              >
                <Trash2 size={17} />
              </button>
            )}
            <SaveButton onClick={onSave} />
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Операция">
            <select
              value={currentForm.operation_type}
              onChange={(event) => updateMethodIdentity({ operation_type: event.target.value as RoomOperationType })}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="Deposit">Депозит</option>
              <option value="Withdrawal">Вывод</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Монета">
              <input
                value={currentForm.currency || ''}
                onChange={(event) => updateMethodIdentity({ currency: event.target.value })}
                placeholder="USDT"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
              />
            </Field>
            <Field label="Сеть">
              <input
                value={currentForm.network || ''}
                onChange={(event) => updateMethodIdentity({ network: event.target.value })}
                placeholder="TRC20"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
              />
            </Field>
          </div>
          {currentForm.operation_type === 'Deposit' && (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/45 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-200">Кошелек для депозита</h4>
                {currentWalletForm.id && (
                  <button
                    type="button"
                    onClick={() => onDeleteWallet(currentWalletForm.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
                  >
                    <Trash2 size={14} />
                    Удалить кошелек
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <Field label="Адрес / почта / аккаунт">
                  <textarea
                    value={currentWalletForm.wallet_address}
                    onChange={(event) => updateWallet({ wallet_address: event.target.value })}
                    rows={4}
                    className="min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm text-slate-100 outline-none focus:border-blue-500"
                  />
                </Field>
                <Field label="Комментарий к кошельку">
                  <textarea
                    value={currentWalletForm.note || ''}
                    onChange={(event) => updateWallet({ note: event.target.value })}
                    rows={3}
                    className="min-h-20 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-500"
                  />
                </Field>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(currentWalletForm.is_active)}
                    onChange={(event) => updateWallet({ is_active: event.target.checked ? 1 : 0 })}
                    className="h-4 w-4"
                  />
                  Кошелек активен
                </label>
              </div>
            </div>
          )}
          <Field label="Лимиты">
            <input
              value={currentForm.limits_text || ''}
              onChange={(event) => onChange({ ...currentForm, limits_text: event.target.value })}
              placeholder="min 200 EUR"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
            />
          </Field>
          <Field label="Комиссия">
            <input
              value={currentForm.fee_text || ''}
              onChange={(event) => onChange({ ...currentForm, fee_text: event.target.value })}
              placeholder="без комиссии"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 outline-none focus:border-blue-500"
            />
          </Field>
          <Field label="Комментарий">
            <textarea
              value={currentForm.note || ''}
              onChange={(event) => onChange({ ...currentForm, note: event.target.value })}
              rows={3}
              className="min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </Field>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
            <input
              type="checkbox"
              checked={Boolean(currentForm.is_active)}
              onChange={(event) => onChange({ ...currentForm, is_active: event.target.checked ? 1 : 0 })}
              className="h-4 w-4"
            />
            Метод активен
          </label>
        </div>
      </section>
    </div>
  )
}

function ModeButton({ active, children, onClick }: { active: boolean, children: ReactNode, onClick: () => void }) {
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

function Field({ label, children }: { label: string, children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function RoomVisibilityButton({ active, onClick }: { active: boolean, onClick: () => void }) {
  const label = active ? 'Скрыть из инфо по румам' : 'Показывать в инфо по румам'

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
        active
          ? 'border-blue-500/60 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
          : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-blue-500 hover:text-slate-300'
      }`}
    >
      {active ? <Eye size={19} /> : <EyeOff size={19} />}
    </button>
  )
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
    >
      <Save size={15} />
      Сохранить
    </button>
  )
}
