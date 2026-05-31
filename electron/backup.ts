import { copyFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import path from 'node:path'

export interface BackupResult {
  created: boolean
  reason?: string
  backupPath?: string
  latestPath?: string
}

const formatBackupDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatBackupTimestamp = (date: Date) => {
  const day = formatBackupDate(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day}-${hours}${minutes}${seconds}`
}

const replaceByCopy = (sourcePath: string, targetPath: string) => {
  const tempPath = `${targetPath}.tmp-${Date.now()}`
  copyFileSync(sourcePath, tempPath)
  renameSync(tempPath, targetPath)
}

export const createDailyDatabaseBackup = (dbPath: string, backupDir: string, now = new Date()): BackupResult => {
  if (!existsSync(dbPath)) {
    return { created: false, reason: 'source-missing' }
  }

  const sourceSize = statSync(dbPath).size
  if (sourceSize === 0) {
    return { created: false, reason: 'source-empty' }
  }

  mkdirSync(backupDir, { recursive: true })

  const backupDate = formatBackupDate(now)
  const backupPath = path.join(backupDir, `transactioner-${backupDate}.db`)
  const latestPath = path.join(backupDir, 'transactioner-latest.db')

  if (existsSync(backupPath)) {
    return { created: false, reason: 'already-created-today', backupPath, latestPath }
  }

  replaceByCopy(dbPath, backupPath)
  replaceByCopy(backupPath, latestPath)

  return { created: true, backupPath, latestPath }
}

export const createDatabaseSnapshotBackup = (
  dbPath: string,
  backupDir: string,
  label: string,
  now = new Date()
): BackupResult => {
  if (!existsSync(dbPath)) {
    return { created: false, reason: 'source-missing' }
  }

  const sourceSize = statSync(dbPath).size
  if (sourceSize === 0) {
    return { created: false, reason: 'source-empty' }
  }

  mkdirSync(backupDir, { recursive: true })

  const safeLabel = label.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'snapshot'
  const backupPath = path.join(backupDir, `transactioner-${safeLabel}-${formatBackupTimestamp(now)}.db`)
  const latestPath = path.join(backupDir, 'transactioner-latest.db')

  replaceByCopy(dbPath, backupPath)
  replaceByCopy(backupPath, latestPath)

  return { created: true, backupPath, latestPath }
}
