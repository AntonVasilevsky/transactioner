import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDailyDatabaseBackup } from './backup'

let tempDir = ''
let dbPath = ''
let backupDir = ''

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'transactioner-backup-'))
  dbPath = path.join(tempDir, 'transactioner.db')
  backupDir = path.join(tempDir, 'backups')
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('createDailyDatabaseBackup', () => {
  it('creates a dated backup and latest copy without moving the source database', () => {
    writeFileSync(dbPath, 'current-db')

    const result = createDailyDatabaseBackup(dbPath, backupDir, new Date('2026-05-28T12:00:00Z'))

    expect(result.created).toBe(true)
    expect(result.backupPath).toBe(path.join(backupDir, 'transactioner-2026-05-28.db'))
    expect(readFileSync(dbPath, 'utf8')).toBe('current-db')
    expect(readFileSync(path.join(backupDir, 'transactioner-2026-05-28.db'), 'utf8')).toBe('current-db')
    expect(readFileSync(path.join(backupDir, 'transactioner-latest.db'), 'utf8')).toBe('current-db')
  })

  it('does not overwrite an existing backup for the same day', () => {
    writeFileSync(dbPath, 'first-version')
    expect(createDailyDatabaseBackup(dbPath, backupDir, new Date('2026-05-28T12:00:00Z')).created).toBe(true)

    writeFileSync(dbPath, 'second-version')
    const result = createDailyDatabaseBackup(dbPath, backupDir, new Date('2026-05-28T18:00:00Z'))

    expect(result.created).toBe(false)
    expect(result.reason).toBe('already-created-today')
    expect(readFileSync(path.join(backupDir, 'transactioner-2026-05-28.db'), 'utf8')).toBe('first-version')
    expect(readFileSync(path.join(backupDir, 'transactioner-latest.db'), 'utf8')).toBe('first-version')
  })

  it('skips backup when the source database file does not exist', () => {
    const result = createDailyDatabaseBackup(dbPath, backupDir, new Date('2026-05-28T12:00:00Z'))

    expect(result.created).toBe(false)
    expect(result.reason).toBe('source-missing')
    expect(existsSync(backupDir)).toBe(false)
  })
})
