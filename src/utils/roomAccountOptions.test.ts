import { describe, expect, it } from 'vitest'
import { filterPaymentAccountsForOperation } from './roomAccountOptions'

const account = (roomName: string): Account => ({
  id: 1,
  player_id: 1,
  roomName,
  roomUsername: 'player',
  roomPlayerId: '',
  email: '',
})

const index = (paymentMethods: RoomKnowledgeIndex['paymentMethods']): RoomKnowledgeIndex => ({
  profiles: [
    { id: 1, room_key: 'redstar', display_name: 'RedStar', is_active: 1 },
    { id: 2, room_key: 'new-room', display_name: 'New Room', is_active: 1 },
  ],
  dealOptions: [],
  paymentMethods,
  walletOptions: [],
  countryOptions: [],
  linkVerificationResponseOptions: [],
})

describe('payment room account filtering', () => {
  it('keeps legacy payment rooms available for withdrawals without separate method rows', () => {
    const accounts = [account('RedStar')]
    const knowledge = index([{
      id: 1,
      room_key: 'redstar',
      deal_type: 'General',
      operation_type: 'Deposit',
      method_name: 'USDT ERC20',
      currency: 'USDT',
      network: 'ERC20',
      fee_text: null,
      limits_text: null,
      note: null,
      sort_order: 1,
      is_active: 1,
    }])

    expect(filterPaymentAccountsForOperation(accounts, knowledge, 'Withdrawal')).toEqual(accounts)
  })

  it('still hides non-payment rooms until the operation is configured', () => {
    const accounts = [account('New Room')]
    const knowledge = index([])

    expect(filterPaymentAccountsForOperation(accounts, knowledge, 'Deposit')).toEqual([])
    expect(filterPaymentAccountsForOperation(accounts, knowledge, 'Withdrawal')).toEqual([])
  })
})
