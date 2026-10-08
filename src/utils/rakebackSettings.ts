export interface RakebackExplorerSettings {
  affiliateWallets: string
}

interface RakebackSettingsStorage {
  getItem: (key: string) => string | null
}

/**
 * Since T-0022 the sender wallets live in the database (one list for every copy of the app,
 * kept in backups). This browser-storage key is only read once per app copy to import a list
 * saved by older versions.
 */
export const rakebackSettingsStorageKey = 'transactioner.rakebackExplorerSettings'
export const rakebackSettingsMigratedKey = 'transactioner.rakebackExplorerSettings.movedToDatabase'

export const defaultRakebackExplorerSettings: RakebackExplorerSettings = {
  affiliateWallets: '',
}

export const loadRakebackExplorerSettings = (
  storage: RakebackSettingsStorage = localStorage
): RakebackExplorerSettings => {
  try {
    return {
      ...defaultRakebackExplorerSettings,
      ...JSON.parse(storage.getItem(rakebackSettingsStorageKey) || '{}'),
    }
  } catch {
    return defaultRakebackExplorerSettings
  }
}

const walletAddressPattern = /(?:0x[a-f0-9]{40}|T[1-9A-HJ-NP-Za-km-z]{33}|bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})/gi

/** Wallet addresses in the free-text list, the one rule for search and import. */
export const rakebackSenderWalletAddresses = (text: string) => new Set(
  (String(text || '').match(walletAddressPattern) || []).map((address) => address.trim().toLowerCase())
)

/**
 * One-time import of a list saved in browser storage by an older version: an empty database
 * list takes it whole; otherwise only lines with addresses the database list lacks are appended.
 */
export const mergeLegacyRakebackWallets = (databaseText: string, legacyText: string) => {
  const legacy = String(legacyText || '')
  const current = String(databaseText || '')
  if (!legacy.trim()) return { text: current, changed: false }
  if (!current.trim()) return { text: legacy, changed: true }
  const known = rakebackSenderWalletAddresses(current)
  const missingLines = legacy
    .split(/\r?\n/)
    .filter((line) => [...rakebackSenderWalletAddresses(line)].some((address) => !known.has(address)))
  if (!missingLines.length) return { text: current, changed: false }
  return { text: `${current.replace(/\s+$/, '')}\n\n${missingLines.map((line) => line.trim()).join('\n')}\n`, changed: true }
}
