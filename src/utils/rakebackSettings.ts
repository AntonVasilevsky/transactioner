export interface RakebackExplorerSettings {
  affiliateWallets: string
}

interface RakebackSettingsStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export const rakebackSettingsStorageKey = 'transactioner.rakebackExplorerSettings'

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

export const saveRakebackExplorerSettings = (
  storage: RakebackSettingsStorage,
  settings: RakebackExplorerSettings
) => {
  storage.setItem(rakebackSettingsStorageKey, JSON.stringify(settings))
}

export const updateRakebackExplorerSettings = (
  storage: RakebackSettingsStorage,
  current: RakebackExplorerSettings,
  updates: Partial<RakebackExplorerSettings>
) => {
  const next = { ...current, ...updates }
  saveRakebackExplorerSettings(storage, next)
  return next
}
