import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDailyDatabaseBackup, createDatabaseSnapshotBackup } from './backup'
import { convertUsdToEur, parseCurrencyAmount } from './currency'
import { TransactionerDatabase, type RoomDealType, type RoomLanguage, type SaveRoomDealInput, type SaveRoomProfileInput, type SaveRoomWalletInput } from './database'
import { resolveTransaction } from './transactionResolver'
import { checkForUpdate, isAllowedReleaseUrl } from './updates'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

const userDataPath = process.env.TRANSACTIONER_USER_DATA_DIR || app.getPath('userData')
mkdirSync(userDataPath, { recursive: true })
const dbPath = path.join(userDataPath, 'transactioner.db')
const backupDir = process.env.TRANSACTIONER_BACKUP_DIR || path.join(app.getPath('documents'), 'Transactioner Backups')
const latestBackupPath = path.join(backupDir, 'transactioner-latest.db')
const appStatePath = path.join(userDataPath, 'app-state.json')
const releaseNotesPath = path.join(process.env.APP_ROOT, 'USER_RELEASE_NOTES.txt')
let store: TransactionerDatabase | null = null
let migrationError: Error | null = null

const readAppState = () => {
  try {
    if (!existsSync(appStatePath)) return {}
    return JSON.parse(readFileSync(appStatePath, 'utf8')) as { lastSeenReleaseNotesVersion?: string }
  } catch {
    return {}
  }
}

const writeAppState = (state: { lastSeenReleaseNotesVersion?: string }) => {
  writeFileSync(appStatePath, JSON.stringify(state, null, 2))
}

const readReleaseNotes = () => {
  try {
    return readFileSync(releaseNotesPath, 'utf8')
  } catch {
    return ''
  }
}

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

const runRoomEditBackup = () => {
  try {
    const result = createDatabaseSnapshotBackup(dbPath, backupDir, 'before-room-edit')
    if (result.created) {
      console.info('Room edit backup created', result.backupPath)
    }
  } catch (err) {
    console.error('Room edit backup failed', err)
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
ipcMain.handle('get-room-registration-stats', () => store?.getRoomRegistrationStats() ?? [])
ipcMain.handle('get-player-by-id', (_, id: number) => store?.getPlayerById(id) ?? null)
ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
}))
ipcMain.handle('get-storage-info', () => ({
  databasePath: dbPath,
  backupDir,
  latestBackupPath,
}))
ipcMain.handle('get-room-knowledge-index', () => store?.getRoomKnowledgeIndex() ?? {
  profiles: [],
  dealOptions: [],
  paymentMethods: [],
  walletOptions: [],
  countryOptions: [],
})
ipcMain.handle('get-room-knowledge-admin-index', () => store?.getRoomKnowledgeAdminIndex() ?? {
  profiles: [],
  dealOptions: [],
  paymentMethods: [],
  walletOptions: [],
  countryOptions: [],
})
ipcMain.handle('get-room-wallets', (_, roomKey: string, dealType?: RoomDealType) => (
  store?.getRoomWallets(roomKey, dealType) ?? []
))
ipcMain.handle('get-room-deals', (_, roomKey: string, language: RoomLanguage, dealType?: RoomDealType) => (
  store?.getRoomDeals(roomKey, language, dealType) ?? []
))
ipcMain.handle('get-room-country-availability', (_, roomKey: string) => (
  store?.getRoomCountryAvailability(roomKey) ?? []
))
ipcMain.handle('save-room-profile', (_, data: SaveRoomProfileInput) => {
  runRoomEditBackup()
  const result = store?.saveRoomProfile(data) ?? { success: false, error: 'База данных недоступна' }
  if (result.success) runDailyBackup()
  return result
})
ipcMain.handle('save-room-deal', (_, data: SaveRoomDealInput) => {
  runRoomEditBackup()
  const result = store?.saveRoomDeal(data) ?? { success: false, error: 'База данных недоступна' }
  if (result.success) runDailyBackup()
  return result
})
ipcMain.handle('save-room-wallet', (_, data: SaveRoomWalletInput) => {
  runRoomEditBackup()
  const result = store?.saveRoomWallet(data) ?? { success: false, error: 'База данных недоступна' }
  if (result.success) runDailyBackup()
  return result
})
ipcMain.handle('check-for-updates', () => checkForUpdate(app.getVersion()))
ipcMain.handle('resolve-transaction', (_, input) => resolveTransaction(input))
ipcMain.handle('convert-usd-to-eur', async (_, amountText: string) => {
  try {
    const amount = parseCurrencyAmount(amountText)
    if (amount === null) {
      return { success: false, error: 'Введите сумму в долларах' }
    }

    const conversion = await convertUsdToEur(amount)
    return { success: true, ...conversion }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
})
ipcMain.handle('get-release-notes', () => {
  const version = app.getVersion()
  const state = readAppState()
  const notes = readReleaseNotes()
  return {
    version,
    notes,
    notesPath: releaseNotesPath,
    shouldShow: Boolean(notes && state.lastSeenReleaseNotesVersion !== version)
  }
})
ipcMain.handle('mark-release-notes-seen', () => {
  writeAppState({ ...readAppState(), lastSeenReleaseNotesVersion: app.getVersion() })
  return { success: true }
})
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

  win.webContents.on('context-menu', (_, params) => {
    const template: Electron.MenuItemConstructorOptions[] = []

    if (params.isEditable) {
      template.push(
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выделить все' },
      )
    } else if (params.selectionText) {
      template.push(
        { role: 'copy', label: 'Копировать' },
        { role: 'selectAll', label: 'Выделить все' },
      )
    }

    if (template.length > 0) {
      Menu.buildFromTemplate(template).popup({ window: win || undefined })
    }
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
