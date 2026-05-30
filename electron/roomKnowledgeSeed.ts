export type RoomDealType = 'General' | 'Direct' | 'Agent'
export type RoomLanguage = 'RU' | 'EN'
export type RoomOperationType = 'Deposit' | 'Withdrawal'

export interface RoomProfileSeed {
  roomKey: string
  displayName: string
  networkName?: string
  isActive?: boolean
  notes?: string
}

export interface RoomDealSeed {
  roomKey: string
  dealType?: RoomDealType
  language: RoomLanguage
  shortText: string
  fullText: string
  registrationUrl?: string
  promoCode?: string
  registrationNote?: string
  sortOrder?: number
  isActive?: boolean
  updatedAt?: string
}

export interface RoomPaymentMethodSeed {
  roomKey: string
  dealType?: RoomDealType
  operationType: RoomOperationType
  methodName: string
  currency?: string
  network?: string
  feeText?: string
  limitsText?: string
  note?: string
  sortOrder?: number
  isActive?: boolean
}

export interface RoomWalletSeed {
  roomKey: string
  dealType?: RoomDealType
  currency: string
  network: string
  walletAddress: string
  memoTag?: string
  feeText?: string
  note?: string
  verifiedAt?: string
  isActive?: boolean
  sortOrder?: number
}

export interface RoomKnowledgeSeed {
  profiles: RoomProfileSeed[]
  deals: RoomDealSeed[]
  paymentMethods: RoomPaymentMethodSeed[]
  wallets: RoomWalletSeed[]
}

export const roomKnowledgeSeed: RoomKnowledgeSeed = {
  profiles: [
    {
      roomKey: 'champion-poker',
      displayName: 'Champion Poker',
      networkName: 'iPoker',
      notes: 'Champion has separate Direct and Agent deal variants.'
    },
    {
      roomKey: 'nexa',
      displayName: 'Nexa',
      notes: 'Agent deal. Fill deal and wallet details from the source knowledge base.'
    },
    {
      roomKey: 'redstar',
      displayName: 'RedStar',
      networkName: 'iPoker',
      notes: 'Direct and Agent deal variants share the same current template.'
    }
  ],
  deals: [],
  paymentMethods: [
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Deposit',
      methodName: 'BTC / TRC20 / ERC20 / Skrill',
      feeText: 'без комиссии',
      sortOrder: 10
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'BTC / TRC20 / ERC20',
      feeText: 'без комиссии',
      sortOrder: 20
    },
    {
      roomKey: 'champion-poker',
      dealType: 'Agent',
      operationType: 'Withdrawal',
      methodName: 'Skrill',
      feeText: '1% комиссия',
      sortOrder: 30
    }
  ],
  wallets: []
}
