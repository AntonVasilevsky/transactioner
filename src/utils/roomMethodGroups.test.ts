import { describe, expect, it } from 'vitest'
import {
  emptyRoomMethodGroupDraft,
  groupRoomPaymentMethods,
  newRoomWalletCommentPhrases,
  planRoomMethodGroupSave,
  roomMethodGroupSummary,
  roomMethodGroupToDraft,
} from './roomMethodGroups'

const method = (overrides: Partial<RoomPaymentMethodInfo>): RoomPaymentMethodInfo => ({
  id: 1,
  room_key: 'champion-poker',
  deal_type: 'Agent',
  operation_type: 'Deposit',
  method_name: 'USDT TRC20',
  currency: 'USDT',
  network: 'TRC20',
  fee_text: null,
  limits_text: null,
  note: null,
  sort_order: 10,
  is_active: 1,
  ...overrides,
} as RoomPaymentMethodInfo)

const wallet = (overrides: Partial<RoomWalletInfo>): RoomWalletInfo => ({
  id: 7,
  room_key: 'champion-poker',
  deal_type: 'Agent',
  currency: 'USDT',
  network: 'TRC20',
  wallet_address: 'TTyKPaFXB3XkkoaGJiksNbh7xE2JbbiBnf',
  memo_tag: null,
  fee_text: null,
  note: null,
  verified_at: null,
  is_active: 1,
  sort_order: 10,
  ...overrides,
} as RoomWalletInfo)

const methods = [
  method({ id: 1, operation_type: 'Deposit', currency: 'Skrill', network: 'EUR', method_name: 'Skrill EUR', fee_text: 'без комиссии', sort_order: 30 }),
  method({ id: 2, operation_type: 'Withdrawal', currency: 'SKRILL', network: 'EUR', method_name: 'Skrill EUR', fee_text: '1% комиссия', limits_text: '10 EUR', sort_order: 40 }),
  method({ id: 3, operation_type: 'Withdrawal', sort_order: 20 }),
  method({ id: 4, operation_type: 'Deposit', sort_order: 10 }),
]

describe('room payment method groups', () => {
  it('shows one row per coin + network in the saved order, deposit and withdrawal together', () => {
    const groups = groupRoomPaymentMethods(methods)
    expect(groups.map((group) => [group.key, group.deposit.map((row) => row.id), group.withdrawal.map((row) => row.id)])).toEqual([
      ['USDT|TRC20', [4], [3]],
      ['SKRILL|EUR', [1], [2]],
    ])
    expect(roomMethodGroupSummary(groups[1])).toBe('Депозит: без комиссии · Вывод: 1% комиссия, 10 EUR')
  })

  it('saves each ticked operation with its own comment and limits and keeps the wallet', () => {
    const [usdt] = groupRoomPaymentMethods(methods)
    const draft = roomMethodGroupToDraft(usdt, 'champion-poker', 'Agent', [wallet({})])
    expect(draft.deposit).toMatchObject({ enabled: true, id: 4, showComment: false })
    expect(draft.wallet).toMatchObject({ id: 7, wallet_address: 'TTyKPaFXB3XkkoaGJiksNbh7xE2JbbiBnf' })

    const plan = planRoomMethodGroupSave({
      ...draft,
      withdrawal: { ...draft.withdrawal, showComment: true, comment: ' без комиссии ', showLimits: false, limits: 'kept hidden' },
    }, usdt)
    expect(plan.error).toBeUndefined()
    expect(plan.confirm).toBeUndefined()
    expect(plan.deletes).toEqual([])
    expect(plan.saves.map((save) => [save.id, save.operation_type, save.fee_text, save.limits_text, save.note])).toEqual([
      [4, 'Deposit', '', '', ''],
      [3, 'Withdrawal', 'без комиссии', '', ''],
    ])
    expect(plan.walletSave).toMatchObject({ id: 7, wallet_address: 'TTyKPaFXB3XkkoaGJiksNbh7xE2JbbiBnf', currency: 'USDT', network: 'TRC20' })
  })

  it('unticking an operation deletes only its rows and never the wallet (owner, T-0019)', () => {
    const [, skrill] = groupRoomPaymentMethods(methods)
    const skrillWallet = wallet({ id: 9, currency: 'SKRILL', network: 'EUR', wallet_address: 'poker@example.com' })
    const draft = roomMethodGroupToDraft(skrill, 'champion-poker', 'Agent', [skrillWallet])

    const noWithdrawal = planRoomMethodGroupSave({ ...draft, withdrawal: { ...draft.withdrawal, enabled: false } }, skrill)
    expect(noWithdrawal.deletes).toEqual([2])
    expect(noWithdrawal.saves.map((save) => save.id)).toEqual([1])
    expect(noWithdrawal.walletSave?.id).toBe(9)
    expect(noWithdrawal.confirm).toMatch(/Вывод/)

    const noDeposit = planRoomMethodGroupSave({ ...draft, deposit: { ...draft.deposit, enabled: false } }, skrill)
    expect(noDeposit.deletes).toEqual([1])
    expect(noDeposit.walletSave).toBeUndefined()
    expect(noDeposit.walletDelete).toBeUndefined()
    expect(noDeposit.confirm).toBe('Снять «Депозит»: комментарий и лимиты этой операции будут удалены.')

    const clearedAddress = planRoomMethodGroupSave({ ...draft, wallet: { ...draft.wallet, wallet_address: ' ' } }, skrill)
    expect(clearedAddress.walletDelete).toBe(9)
    expect(clearedAddress.confirm).toMatch(/Адрес кошелька очищен/)
  })

  it('"Новый" or a rename onto an existing coin + network opens it instead of overwriting', () => {
    const groups = groupRoomPaymentMethods(methods)
    const draft = { ...emptyRoomMethodGroupDraft('champion-poker', 'Agent'), currency: 'usdt', network: 'trc20', wallet: { wallet_address: 't-TEST' } }
    expect(planRoomMethodGroupSave(draft, undefined, groups)).toMatchObject({
      existingGroupKey: 'USDT|TRC20',
      error: 'USDT TRC20 уже есть в кошельках этого рума. Откройте его для редактирования.',
      saves: [],
    })
    const skrill = groups[1]
    const rename = { ...roomMethodGroupToDraft(skrill, 'champion-poker', 'Agent', []), currency: 'USDT', network: 'TRC20' }
    expect(planRoomMethodGroupSave(rename, skrill, groups).existingGroupKey).toBe('USDT|TRC20')
    expect(planRoomMethodGroupSave(roomMethodGroupToDraft(skrill, 'champion-poker', 'Agent', []), skrill, groups).error).toBeUndefined()
  })

  it('reuses a kept wallet of the same coin + network and refuses a second copy of an address', () => {
    const kept = wallet({ id: 11, currency: 'LTC', network: 'LTC', wallet_address: 'ltc1-kept' })
    const draft = { ...emptyRoomMethodGroupDraft('champion-poker', 'Agent'), currency: 'LTC', network: 'LTC', wallet: { wallet_address: 'ltc1-new' } }
    expect(planRoomMethodGroupSave(draft, undefined, [], [kept]).walletSave).toMatchObject({ id: 11, wallet_address: 'ltc1-new' })

    const usdt = groupRoomPaymentMethods(methods)[0]
    const legacy = [wallet({ id: 7 }), wallet({ id: 8, wallet_address: 'TOther' })]
    const edit = roomMethodGroupToDraft(usdt, 'champion-poker', 'Agent', legacy)
    expect(planRoomMethodGroupSave({ ...edit, wallet: { ...edit.wallet, wallet_address: 'TOther' } }, usdt, [usdt], legacy).error)
      .toBe('Адрес TOther уже сохранён для USDT TRC20.')
  })

  it('keeps each operation\'s own active flag', () => {
    const rows = [method({ id: 21, operation_type: 'Deposit', is_active: 1 }), method({ id: 22, operation_type: 'Withdrawal', is_active: 0 })]
    const [group] = groupRoomPaymentMethods(rows)
    const draft = roomMethodGroupToDraft(group, 'champion-poker', 'Agent', [])
    expect([draft.deposit.active, draft.withdrawal.active]).toEqual([true, false])
    expect(planRoomMethodGroupSave(draft, group, [group]).saves.map((save) => [save.id, save.is_active])).toEqual([[21, 1], [22, 0]])
  })

  it('refuses an empty coin or no operation, and creates a new group with a wallet', () => {
    const draft = emptyRoomMethodGroupDraft('nexa', 'Agent')
    expect(planRoomMethodGroupSave(draft, undefined).error).toBe('Заполните монету и сеть')
    expect(planRoomMethodGroupSave({ ...draft, currency: 'USDT', network: 'TRC20', deposit: { ...draft.deposit, enabled: false } }, undefined).error)
      .toBe('Отметьте депозит, вывод или оба')

    const plan = planRoomMethodGroupSave({
      ...draft,
      currency: 'USDT',
      network: 'TRC20',
      withdrawal: { ...draft.withdrawal, enabled: true },
      wallet: { wallet_address: ' TNexa ' },
    }, undefined)
    expect(plan.saves.map((save) => [save.id, save.operation_type, save.method_name])).toEqual([
      [undefined, 'Deposit', 'USDT TRC20'],
      [undefined, 'Withdrawal', 'USDT TRC20'],
    ])
    expect(plan.walletSave).toMatchObject({ id: undefined, wallet_address: 'TNexa', room_key: 'nexa', deal_type: 'Agent' })
  })

  it('collects only new comments that have both translations', () => {
    const draft = emptyRoomMethodGroupDraft('nexa', 'Agent')
    const known = (comment: string) => comment === 'без комиссии'
    expect(newRoomWalletCommentPhrases({
      ...draft,
      deposit: { ...draft.deposit, showComment: true, comment: ' только через нас ', translationEN: 'only through us', translationES: 'solo a través de nosotros' },
      withdrawal: { ...draft.withdrawal, enabled: true, showComment: true, comment: 'без комиссии', translationEN: 'x', translationES: 'y' },
    }, known)).toEqual([{ RU: 'только через нас', EN: 'only through us', ES: 'solo a través de nosotros' }])
    expect(newRoomWalletCommentPhrases({
      ...draft,
      deposit: { ...draft.deposit, showComment: true, comment: 'только через нас', translationEN: 'only through us' },
    }, known)).toEqual([])
    expect(newRoomWalletCommentPhrases({
      ...draft,
      deposit: { ...draft.deposit, showComment: false, comment: 'только через нас', translationEN: 'a', translationES: 'b' },
    }, known)).toEqual([])
  })

  it('one "Активен" for a deposit switches its row and its wallet together', () => {
    const [group] = groupRoomPaymentMethods([method({ id: 31, operation_type: 'Deposit', is_active: 1 })])
    const inactiveWallet = wallet({ id: 32, is_active: 0 })
    const draft = roomMethodGroupToDraft(group, 'champion-poker', 'Agent', [inactiveWallet])
    expect(draft.deposit.active).toBe(false)

    const on = planRoomMethodGroupSave({ ...draft, deposit: { ...draft.deposit, active: true } }, group, [group], [inactiveWallet])
    expect(on.saves[0].is_active).toBe(1)
    expect(on.walletSave).toMatchObject({ id: 32, is_active: 1 })

    const off = planRoomMethodGroupSave({ ...draft, deposit: { ...draft.deposit, active: false } }, group, [group], [inactiveWallet])
    expect(off.saves[0].is_active).toBe(0)
    expect(off.walletSave).toMatchObject({ id: 32, is_active: 0 })
  })
})
