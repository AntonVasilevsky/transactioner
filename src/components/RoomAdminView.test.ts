import { describe, expect, it } from 'vitest'
import { findWalletForMethod } from '../utils/roomAdminWalletMatching'

const wallet = (
  id: number,
  roomKey: string,
  dealType: RoomDealType,
  walletAddress: string,
  network = 'TRC20'
): RoomWalletInfo => ({
  id,
  room_key: roomKey,
  deal_type: dealType,
  currency: 'USDT',
  network,
  wallet_address: walletAddress,
  is_active: 1,
  sort_order: id * 10,
})

const method = (
  roomKey: string,
  dealType: RoomDealType,
  network = 'TRC20'
): SaveRoomPaymentMethodInput => ({
  room_key: roomKey,
  deal_type: dealType,
  operation_type: 'Deposit',
  method_name: `USDT ${network}`,
  currency: 'USDT',
  network,
})

describe('RoomAdminView wallet matching', () => {
  it('matches payment methods only to wallets from the same room and deal type', () => {
    const wallets: RoomWalletInfo[] = [
      wallet(1, 'redstar', 'General', 'redstar-trc20'),
      wallet(2, 'nexa', 'Agent', 'nexa-trc20'),
      wallet(3, 'champion-poker', 'Agent', 'champion-trc20'),
      wallet(4, 'future-agent-room', 'Agent', 'future-trc20'),
    ]

    expect(findWalletForMethod(wallets, method('redstar', 'General'))?.wallet_address).toBe('redstar-trc20')
    expect(findWalletForMethod(wallets, method('nexa', 'Agent'))?.wallet_address).toBe('nexa-trc20')
    expect(findWalletForMethod(wallets, method('champion-poker', 'Agent'))?.wallet_address).toBe('champion-trc20')
    expect(findWalletForMethod(wallets, method('future-agent-room', 'Agent'))?.wallet_address).toBe('future-trc20')
  })

  it('does not reuse a same-network wallet from another room while wallets are stale', () => {
    const wallets: RoomWalletInfo[] = [
      wallet(1, 'redstar', 'General', 'redstar-trc20'),
      wallet(2, 'champion-poker', 'Agent', 'champion-trc20'),
    ]

    expect(findWalletForMethod(wallets, method('nexa', 'Agent'))).toBeUndefined()
    expect(findWalletForMethod(wallets, method('future-agent-room', 'Agent'))).toBeUndefined()
  })

  it('keeps same-room methods isolated by deal type', () => {
    const wallets: RoomWalletInfo[] = [
      wallet(1, 'future-room', 'General', 'future-general-trc20'),
      wallet(2, 'future-room', 'Agent', 'future-agent-trc20'),
    ]

    expect(findWalletForMethod(wallets, method('future-room', 'Agent'))?.wallet_address).toBe('future-agent-trc20')
    expect(findWalletForMethod(wallets, method('future-room', 'General'))?.wallet_address).toBe('future-general-trc20')
  })

  it('treats the same wallet address in different rooms as separate room wallets', () => {
    const sharedAddress = 'TSharedOperationalWallet'
    const wallets: RoomWalletInfo[] = [
      wallet(1, 'nexa', 'Agent', sharedAddress),
      wallet(2, 'champion-poker', 'Agent', sharedAddress),
      wallet(3, 'future-agent-room', 'Agent', sharedAddress),
    ]

    expect(findWalletForMethod(wallets, method('nexa', 'Agent'))?.id).toBe(1)
    expect(findWalletForMethod(wallets, method('champion-poker', 'Agent'))?.id).toBe(2)
    expect(findWalletForMethod(wallets, method('future-agent-room', 'Agent'))?.id).toBe(3)
  })
})
