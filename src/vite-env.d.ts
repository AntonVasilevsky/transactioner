/// <reference types="vite/client" />

type ContactMethod = 'TG' | 'WA' | 'Discord' | 'Teams' | 'Email'
type RoomDealType = 'General' | 'Direct' | 'Agent'
type RoomLanguage = 'RU' | 'EN'
type RoomOperationType = 'Deposit' | 'Withdrawal'
type RoomCountryStatus = 'Available' | 'Unavailable' | 'Check'

interface Account {
  id?: number
  player_id?: number
  room_name?: string
  roomName?: string
  room_username?: string | null
  roomUsername?: string
  room_player_id?: string | null
  roomPlayerId?: string
  email?: string | null
}

interface PlayerContact {
  id?: number
  player_id?: number
  contact_method?: ContactMethod
  contactMethod?: ContactMethod
  contact_value?: string
  contactValue?: string
  is_primary?: number
  isPrimary?: boolean
}

interface Player {
  id?: number
  messenger_username: string
  contact_method: ContactMethod
  default_wallet?: string | null
  default_wallet_network?: string | null
  last_used_at?: number
  contact_summary?: string | null
  room_summary?: string | null
  accounts?: Account[]
  contacts?: PlayerContact[]
}

interface PlayerPayload {
  player: Player
  accounts: Account[]
  contacts?: PlayerContact[]
}

interface SavePlayerInput {
  id?: number
  messenger_username: string
  contact_method: ContactMethod
  contacts?: PlayerContact[]
  default_wallet?: string
  default_wallet_network?: string
  accounts: Account[]
}

interface MutationResult {
  success: boolean
  error?: string
}

interface SavePlayerResult extends MutationResult {
  id?: number
}

interface UpdateCheckResult {
  available: boolean
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  error?: string
}

interface StorageInfo {
  databasePath: string
  backupDir: string
  latestBackupPath: string
}

interface RoomProfileInfo {
  id: number
  room_key: string
  display_name: string
  network_name?: string | null
  is_active: number
  notes?: string | null
}

interface RoomDealInfo {
  id: number
  room_key: string
  deal_type: RoomDealType
  language: RoomLanguage
  short_text: string
  full_text: string
  registration_url?: string | null
  promo_code?: string | null
  registration_note?: string | null
  sort_order: number
  is_active: number
  updated_at?: string | null
}

interface RoomPaymentMethodInfo {
  id: number
  room_key: string
  deal_type: RoomDealType
  operation_type: RoomOperationType
  method_name: string
  currency: string
  network: string
  fee_text?: string | null
  limits_text?: string | null
  note?: string | null
  sort_order: number
  is_active: number
}

interface RoomWalletInfo {
  id: number
  room_key: string
  deal_type: RoomDealType
  currency: string
  network: string
  wallet_address: string
  memo_tag?: string | null
  fee_text?: string | null
  note?: string | null
  verified_at?: string | null
  is_active: number
  sort_order: number
}

interface RoomCountryAvailabilityInfo {
  id: number
  room_key: string
  country_code: string
  country_name: string
  status: RoomCountryStatus
  deal_type: RoomDealType | ''
  language: RoomLanguage | ''
  note?: string | null
  source_date?: string | null
  sort_order: number
  is_active: number
}

interface RoomKnowledgeIndex {
  profiles: RoomProfileInfo[]
  dealOptions: Array<{ room_key: string; deal_type: RoomDealType; language: RoomLanguage }>
  paymentMethods: RoomPaymentMethodInfo[]
  walletOptions: Array<{ room_key: string; deal_type: RoomDealType; currency: string; network: string; is_active: number }>
  countryOptions: RoomCountryAvailabilityInfo[]
}

interface AppInfo {
  version: string
}

interface ResolveTransactionInput {
  txInput: string
  roomName?: string
  operationType?: string
}

interface ResolveTransactionResult {
  success: boolean
  status: 'resolved' | 'not_found' | 'invalid' | 'error'
  txHash?: string
  network?: 'ethereum' | 'bsc' | 'tron' | 'bitcoin'
  explorerUrl?: string
  amount?: string
  currency?: string
  displayAmount?: string
  convertedAmount?: string
  convertedCurrency?: string
  convertedDisplayAmount?: string
  fxRate?: number
  fxDate?: string
  error?: string
}

interface CurrencyConversionResult extends MutationResult {
  inputAmount?: string
  inputCurrency?: 'USD'
  convertedAmount?: string
  convertedCurrency?: 'EUR'
  convertedDisplayAmount?: string
  fxRate?: number
  fxDate?: string
}

interface ReleaseNotesInfo {
  version: string
  notes: string
  notesPath: string
  shouldShow: boolean
}

interface Window {
  electronAPI: {
    searchPlayer: (username: string) => Promise<PlayerPayload | PlayerPayload[] | null>;
    savePlayer: (data: SavePlayerInput) => Promise<SavePlayerResult>;
    getAllPlayers: () => Promise<Player[]>;
    getPlayerById: (id: number) => Promise<PlayerPayload | null>;
    getAppInfo: () => Promise<AppInfo>;
    getStorageInfo: () => Promise<StorageInfo>;
    getRoomKnowledgeIndex: () => Promise<RoomKnowledgeIndex>;
    getRoomWallets: (roomKey: string, dealType?: RoomDealType) => Promise<RoomWalletInfo[]>;
    getRoomDeals: (roomKey: string, language: RoomLanguage, dealType?: RoomDealType) => Promise<RoomDealInfo[]>;
    getRoomCountryAvailability: (roomKey: string) => Promise<RoomCountryAvailabilityInfo[]>;
    checkForUpdates: () => Promise<UpdateCheckResult>;
    resolveTransaction: (input: ResolveTransactionInput) => Promise<ResolveTransactionResult>;
    convertUsdToEur: (amount: string) => Promise<CurrencyConversionResult>;
    getReleaseNotes: () => Promise<ReleaseNotesInfo>;
    markReleaseNotesSeen: () => Promise<MutationResult>;
    openExternalUrl: (url: string) => Promise<MutationResult>;
    deletePlayer: (id: number) => Promise<MutationResult>;
    updateDefaultWallet: (id: number, wallet: string) => Promise<MutationResult>;
    updateDefaultWalletDetails: (id: number, wallet: string, network: string) => Promise<MutationResult>;
  }
}
