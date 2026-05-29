import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDailyDatabaseBackup } from './backup'
import { TransactionerDatabase } from './database'
import { checkForUpdate, isAllowedReleaseUrl } from './updates'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

const userDataPath = process.env.TRANSACTIONER_USER_DATA_DIR || app.getPath('userData')
mkdirSync(userDataPath, { recursive: true })
const dbPath = path.join(userDataPath, 'transactioner.db')
const backupDir = process.env.TRANSACTIONER_BACKUP_DIR || path.join(app.getPath('documents'), 'Transactioner Backups')
const latestBackupPath = path.join(backupDir, 'transactioner-latest.db')
let store: TransactionerDatabase | null = null
let migrationError: Error | null = null

const runDailyBackup = () => {
  try {
    const result = createDailyDatabaseBackup(dbPath, backupDir)
    if (result.created) {
      console.info('Database backup created', result.backupPath)
    }
  } catch (err) {
    console.error('Database backup failed', err)
  }
}

try {
  runDailyBackup()
  store = new TransactionerDatabase(dbPath)
} catch (err) {
  console.error('Database migration failed', err)
  migrationError = err instanceof Error ? err : new Error(String(err))
}

ipcMain.handle('search-player', (_, username: string) => store?.searchPlayer(username) ?? null)
ipcMain.handle('get-all-players', () => store?.getAllPlayers() ?? [])
ipcMain.handle('get-player-by-id', (_, id: number) => store?.getPlayerById(id) ?? null)
ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
}))
ipcMain.handle('get-storage-info', () => ({
  databasePath: dbPath,
  backupDir,
  latestBackupPath,
}))
ipcMain.handle('check-for-updates', () => checkForUpdate(app.getVersion()))
ipcMain.handle('open-external-url', (_, url: string) => {
  if (!isAllowedReleaseUrl(url)) {
    return { success: false, error: 'Ссылка обновления заблокирована' }
  }

  return shell.openExternal(url).then(() => ({ success: true }))
})
ipcMain.handle('delete-player', (_, id: number) => {
  const result = store?.deletePlayer(id) ?? { success: false, error: 'База данных недоступна' }
  if (result.success) runDailyBackup()
  return result
})
ipcMain.handle('save-player', (_, data) => {
  const result = store?.savePlayer(data) ?? { success: false, error: 'База данных недоступна' }
  if (result.success) runDailyBackup()
  return result
})
ipcMain.handle('update-default-wallet', (_, id: number, wallet: string) => {
  const result = store?.updateDefaultWallet(id, wallet) ?? { success: false, error: 'База данных недоступна' }
  if (result.success) runDailyBackup()
  return result
})
ipcMain.handle('update-default-wallet-details', (_, id: number, wallet: string, network: string) => {
  const result = store?.updateDefaultWalletDetails(id, wallet, network) ?? { success: false, error: 'База данных недоступна' }
  if (result.success) runDailyBackup()
  return result
})

let win: BrowserWindow | null

function createWindow() {
  if (migrationError) {
    dialog.showErrorBox(
      'Transactioner database migration failed',
      `The local database needs manual cleanup before the app can continue.\n\n${migrationError.message}\n\nDatabase path:\n${dbPath}`
    )
    app.quit()
    return
  }

  win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.APP_ROOT, 'dist/index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  store?.close()
})

app.whenReady().then(createWindow)
