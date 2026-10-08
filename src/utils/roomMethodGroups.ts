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
  is_active: number
  deposit: RoomMethodOperationDraft
  withdrawal: RoomMethodOperationDraft
  wallet: {
    id?: number
    wallet_address: string
    is_active: number
    original?: RoomWalletInfo
  }
}

export interface RoomMethodGroupSavePlan {
  error?: string
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
  is_active: 1,
  deposit: { enabled: true, showComment: false, comment: '', showLimits: false, limits: '' },
  withdrawal: { enabled: false, showComment: false, comment: '', showLimits: false, limits: '' },
  wallet: { wallet_address: '', is_active: 1 },
})

export const roomMethodGroupToDraft = (
  group: RoomMethodGroup,
  roomKey: string,
  dealType: RoomDealType,
  wallets: RoomWalletInfo[]
): RoomMethodGroupDraft => {
  const wallet = findWalletForMethod(wallets, { room_key: roomKey, deal_type: dealType, currency: group.currency, network: group.network })
  return {
    groupKey: group.key,
    room_key: roomKey,
    deal_type: dealType,
    currency: group.currency,
    network: group.network,
    sort_order: group.sortOrder,
    is_active: group.isActive ? 1 : 0,
    deposit: operationDraft(group.deposit),
    withdrawal: operationDraft(group.withdrawal),
    wallet: {
      id: wallet?.id,
      wallet_address: wallet?.wallet_address || '',
      is_active: wallet ? wallet.is_active : 1,
      original: wallet,
    },
  }
}

const shortAddress = (address: string) => (address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address)

export const planRoomMethodGroupSave = (
  draft: RoomMethodGroupDraft,
  group: RoomMethodGroup | undefined
): RoomMethodGroupSavePlan => {
  const currency = draft.currency.trim()
  const network = draft.network.trim()
  const empty: RoomMethodGroupSavePlan = { saves: [], deletes: [] }
  if (!currency || !network) return { ...empty, error: 'Заполните монету и сеть' }
  if (!draft.deposit.enabled && !draft.withdrawal.enabled) return { ...empty, error: 'Отметьте депозит, вывод или оба' }

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
        is_active: draft.is_active,
      })
    } else if (rows.length) {
      plan.deletes.push(...rows.map((row) => row.id))
      if (rows.some((row) => row.fee_text?.trim() || row.limits_text?.trim())) {
        confirmations.push(`Снять «${operation === 'Deposit' ? 'Депозит' : 'Вывод'}»: комментарий и лимиты этой операции будут удалены.`)
      }
    }
  }

  const address = draft.wallet.wallet_address.trim()
  if (draft.deposit.enabled && address) {
    const original = draft.wallet.original
    plan.walletSave = {
      id: draft.wallet.id,
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
      is_active: draft.wallet.is_active,
    }
  } else if (draft.wallet.id) {
    plan.walletDelete = draft.wallet.id
    const saved = draft.wallet.original?.wallet_address || address
    confirmations.push(draft.deposit.enabled
      ? `Адрес кошелька очищен: кошелёк ${shortAddress(saved)} будет удалён.`
      : `Снять «Депозит»: кошелёк ${shortAddress(saved)} тоже будет удалён.`)
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
