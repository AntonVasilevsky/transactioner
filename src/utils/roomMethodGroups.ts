import { findWalletForMethod, normalizeAdminToken } from './roomAdminWalletMatching'

/**
 * Room admin shows one row per coin + network (T-0019). In the database deposit and
 * withdrawal stay separate payment-method rows with their own fee and limits; the deposit
 * wallet stays in room_wallets (ADR-0003). This module turns rows into groups and an edited
 * group back into the exact rows and wallet to save or delete.
 */
export interface RoomMethodGroup {
  key: string
  currency: string
  network: string
  /** Usually one row; more only for old look-alike rows the merge step had to keep. */
  deposit: RoomPaymentMethodInfo[]
  withdrawal: RoomPaymentMethodInfo[]
  sortOrder: number
  isActive: boolean
}

export interface RoomMethodOperationDraft {
  enabled: boolean
  /** Each operation keeps its own active flag (a room may stop paying out but still take deposits). */
  active: boolean
  id?: number
  showComment: boolean
  comment: string
  showLimits: boolean
  limits: string
  /** EN / ES for a comment that is not a known phrase yet; saved once as a new phrase. */
  translationEN?: string
  translationES?: string
}

export interface RoomMethodGroupDraft {
  groupKey?: string
  room_key: string
  deal_type: RoomDealType
  currency: string
  network: string
  sort_order: number
  deposit: RoomMethodOperationDraft
  withdrawal: RoomMethodOperationDraft
  /** Deposit address; its active flag follows deposit.active (one switch, owner 2026-10-08). */
  wallet: {
    id?: number
    wallet_address: string
    original?: RoomWalletInfo
  }
}

export interface RoomMethodGroupSavePlan {
  error?: string
  /** The coin + network already has a group; the operator should open it instead. */
  existingGroupKey?: string
  /** A question the operator must confirm before the plan runs. */
  confirm?: string
  saves: SaveRoomPaymentMethodInput[]
  deletes: number[]
  walletSave?: SaveRoomWalletInput
  walletDelete?: number
}

export const roomMethodGroupKey = (method: Pick<RoomPaymentMethodInfo, 'currency' | 'network' | 'method_name'>) => {
  const currency = normalizeAdminToken(method.currency)
  const network = normalizeAdminToken(method.network)
  return currency || network ? `${currency}|${network}` : `name:${normalizeAdminToken(method.method_name)}`
}

export const groupRoomPaymentMethods = (methods: RoomPaymentMethodInfo[]): RoomMethodGroup[] => {
  const groups = new Map<string, RoomMethodGroup>()
  const ordered = [...methods].sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0) || left.id - right.id)
  for (const method of ordered) {
    const key = roomMethodGroupKey(method)
    const group = groups.get(key) || {
      key,
      currency: (method.currency || method.method_name || '').trim(),
      network: (method.network || '').trim(),
      deposit: [],
      withdrawal: [],
      sortOrder: method.sort_order || 0,
      isActive: false,
    }
    if (method.operation_type === 'Withdrawal') group.withdrawal.push(method)
    else group.deposit.push(method)
    group.isActive = group.isActive || Boolean(method.is_active)
    groups.set(key, group)
  }
  return Array.from(groups.values())
}

const operationDraft = (rows: RoomPaymentMethodInfo[]): RoomMethodOperationDraft => {
  const row = rows[0]
  return {
    enabled: Boolean(row),
    active: row ? Boolean(row.is_active) : true,
    id: row?.id,
    showComment: Boolean(row?.fee_text?.trim()),
    comment: row?.fee_text?.trim() || '',
    showLimits: Boolean(row?.limits_text?.trim()),
    limits: row?.limits_text?.trim() || '',
  }
}

export const emptyRoomMethodGroupDraft = (roomKey: string, dealType: RoomDealType): RoomMethodGroupDraft => ({
  room_key: roomKey,
  deal_type: dealType,
  currency: '',
  network: '',
  sort_order: 0,
  deposit: { enabled: true, active: true, showComment: false, comment: '', showLimits: false, limits: '' },
  withdrawal: { enabled: false, active: true, showComment: false, comment: '', showLimits: false, limits: '' },
  wallet: { wallet_address: '' },
})

export const roomMethodGroupToDraft = (
  group: RoomMethodGroup,
  roomKey: string,
  dealType: RoomDealType,
  wallets: RoomWalletInfo[]
): RoomMethodGroupDraft => {
  const wallet = findWalletForMethod(wallets, { room_key: roomKey, deal_type: dealType, currency: group.currency, network: group.network })
  const deposit = operationDraft(group.deposit)
  // A deposit is active only when both its row and its wallet are: the operator sees one switch.
  if (wallet && !wallet.is_active) deposit.active = false
  return {
    groupKey: group.key,
    room_key: roomKey,
    deal_type: dealType,
    currency: group.currency,
    network: group.network,
    sort_order: group.sortOrder,
    deposit,
    withdrawal: operationDraft(group.withdrawal),
    wallet: {
      id: wallet?.id,
      wallet_address: wallet?.wallet_address || '',
      original: wallet,
    },
  }
}

const shortAddress = (address: string) => (address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address)

export const planRoomMethodGroupSave = (
  draft: RoomMethodGroupDraft,
  group: RoomMethodGroup | undefined,
  groups: RoomMethodGroup[] = [],
  wallets: RoomWalletInfo[] = []
): RoomMethodGroupSavePlan => {
  const currency = draft.currency.trim()
  const network = draft.network.trim()
  const empty: RoomMethodGroupSavePlan = { saves: [], deletes: [] }
  if (!currency || !network) return { ...empty, error: 'Заполните монету и сеть' }
  if (!draft.deposit.enabled && !draft.withdrawal.enabled) return { ...empty, error: 'Отметьте депозит, вывод или оба' }

  // One group per coin + network: "Новый" or a rename onto an existing one must not overwrite it.
  const targetKey = roomMethodGroupKey({ currency, network, method_name: '' })
  if (targetKey !== draft.groupKey && groups.some((item) => item.key === targetKey)) {
    return { ...empty, existingGroupKey: targetKey, error: `${currency.toUpperCase()} ${network.toUpperCase()} уже есть в кошельках этого рума. Откройте его для редактирования.` }
  }
  // A wallet for this coin + network may already exist (kept when "Депозит" was unticked earlier).
  const savedWallet = draft.wallet.id ? draft.wallet.original : findWalletForMethod(wallets, {
    room_key: draft.room_key, deal_type: draft.deal_type, currency, network,
  })

  const plan: RoomMethodGroupSavePlan = { saves: [], deletes: [] }
  const confirmations: string[] = []
  for (const operation of ['Deposit', 'Withdrawal'] as const) {
    const part = operation === 'Deposit' ? draft.deposit : draft.withdrawal
    const rows = operation === 'Deposit' ? group?.deposit || [] : group?.withdrawal || []
    if (part.enabled) {
      plan.saves.push({
        id: part.id,
        room_key: draft.room_key,
        deal_type: draft.deal_type,
        operation_type: operation,
        method_name: `${currency} ${network}`,
        currency,
        network,
        fee_text: part.showComment ? part.comment.trim() : '',
        limits_text: part.showLimits ? part.limits.trim() : '',
        note: '',
        sort_order: draft.sort_order,
        is_active: part.active ? 1 : 0,
      })
    } else if (rows.length) {
      plan.deletes.push(...rows.map((row) => row.id))
      if (rows.some((row) => row.fee_text?.trim() || row.limits_text?.trim())) {
        confirmations.push(`Снять «${operation === 'Deposit' ? 'Депозит' : 'Вывод'}»: комментарий и лимиты этой операции будут удалены.`)
      }
    }
  }

  const address = draft.wallet.wallet_address.trim()
  const walletId = draft.wallet.id ?? savedWallet?.id
  const duplicateAddress = wallets.some((wallet) => (
    wallet.id !== walletId &&
    wallet.room_key === draft.room_key &&
    wallet.deal_type === draft.deal_type &&
    wallet.wallet_address.trim() === address &&
    normalizeAdminToken(wallet.currency) === normalizeAdminToken(currency) &&
    normalizeAdminToken(wallet.network) === normalizeAdminToken(network)
  ))
  if (draft.deposit.enabled && address && duplicateAddress) {
    return { ...empty, error: `Адрес ${shortAddress(address)} уже сохранён для ${currency.toUpperCase()} ${network.toUpperCase()}.` }
  }
  if (draft.deposit.enabled && address) {
    const original = savedWallet
    plan.walletSave = {
      id: walletId,
      room_key: draft.room_key,
      deal_type: draft.deal_type,
      currency,
      network,
      wallet_address: address,
      memo_tag: original?.memo_tag || '',
      fee_text: original?.fee_text || '',
      note: original?.note || '',
      verified_at: original?.verified_at || '',
      sort_order: draft.sort_order,
      is_active: draft.deposit.active ? 1 : 0,
    }
  } else if (draft.deposit.enabled && walletId) {
    // Clearing the address is an explicit edit; unticking "Депозит" never removes the wallet (owner, T-0019).
    plan.walletDelete = walletId
    confirmations.push(`Адрес кошелька очищен: кошелёк ${shortAddress(savedWallet?.wallet_address || '')} будет удалён.`)
  }

  if (confirmations.length) plan.confirm = confirmations.join('\n')
  return plan
}

const operationSummary = (label: string, row: RoomPaymentMethodInfo | undefined) => {
  if (!row) return ''
  const details = [row.fee_text?.trim(), row.limits_text?.trim()].filter(Boolean).join(', ')
  return details ? `${label}: ${details}` : ''
}

export const roomMethodGroupSummary = (group: RoomMethodGroup) => [
  operationSummary('Депозит', group.deposit[0]),
  operationSummary('Вывод', group.withdrawal[0]),
].filter(Boolean).join(' · ')

/** New phrases to store before saving: comments typed for the first time with both translations. */
export const newRoomWalletCommentPhrases = (
  draft: RoomMethodGroupDraft,
  isTranslated: (comment: string) => boolean
): Array<Record<RoomLanguage, string>> => {
  const phrases: Array<Record<RoomLanguage, string>> = []
  for (const part of [draft.deposit, draft.withdrawal]) {
    const comment = part.comment.trim()
    const en = (part.translationEN || '').trim()
    const es = (part.translationES || '').trim()
    if (!part.enabled || !part.showComment || !comment || isTranslated(comment) || !en || !es) continue
    if (phrases.some((phrase) => phrase.RU.toLowerCase() === comment.toLowerCase())) continue
    phrases.push({ RU: comment, EN: en, ES: es })
  }
  return phrases
}
