/// <reference types="vite/client" />

type ContactMethod = 'TG' | 'WA' | 'Discord' | 'Teams' | 'Email'

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
  network?: 'ethereum' | 'bsc' | 'tron'
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

interface Window {
  electronAPI: {
    searchPlayer: (username: string) => Promise<PlayerPayload | PlayerPayload[] | null>;
    savePlayer: (data: SavePlayerInput) => Promise<SavePlayerResult>;
    getAllPlayers: () => Promise<Player[]>;
    getPlayerById: (id: number) => Promise<PlayerPayload | null>;
    getAppInfo: () => Promise<AppInfo>;
    getStorageInfo: () => Promise<StorageInfo>;
    checkForUpdates: () => Promise<UpdateCheckResult>;
    resolveTransaction: (input: ResolveTransactionInput) => Promise<ResolveTransactionResult>;
    openExternalUrl: (url: string) => Promise<MutationResult>;
    deletePlayer: (id: number) => Promise<MutationResult>;
    updateDefaultWallet: (id: number, wallet: string) => Promise<MutationResult>;
    updateDefaultWalletDetails: (id: number, wallet: string, network: string) => Promise<MutationResult>;
  }
}
