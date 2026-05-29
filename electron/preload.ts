import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  searchPlayer: (username: string) => ipcRenderer.invoke('search-player', username),
  savePlayer: (data: SavePlayerInput) => ipcRenderer.invoke('save-player', data),
  getAllPlayers: () => ipcRenderer.invoke('get-all-players'),
  getPlayerById: (id: number) => ipcRenderer.invoke('get-player-by-id', id),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  deletePlayer: (id: number) => ipcRenderer.invoke('delete-player', id),
  updateDefaultWallet: (id: number, wallet: string) => ipcRenderer.invoke('update-default-wallet', id, wallet),
  updateDefaultWalletDetails: (id: number, wallet: string, network: string) => ipcRenderer.invoke('update-default-wallet-details', id, wallet, network),
})
