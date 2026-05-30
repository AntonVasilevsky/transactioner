import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { TransactionerDatabase, type SavePlayerInput } from './database'

let tempDir = ''
let db: TransactionerDatabase

const basePlayer = (overrides: Partial<SavePlayerInput> = {}): SavePlayerInput => ({
  messenger_username: '@test1',
  contact_method: 'TG',
  contacts: [
    { contactMethod: 'TG', contactValue: '@test1' }
  ],
  default_wallet: '',
  default_wallet_network: '',
  accounts: [
    { roomName: 'RedStar', roomUsername: 'redstar test1', roomPlayerId: '', email: '' }
  ],
  ...overrides
})

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'transactioner-db-'))
  db = new TransactionerDatabase(path.join(tempDir, 'transactioner.db'))
})

afterEach(() => {
  try {
    db.close()
  } catch {
    // Some migration tests intentionally close the default DB before opening a legacy fixture.
  }
  rmSync(tempDir, { recursive: true, force: true })
})

describe('TransactionerDatabase', () => {
  it('saves a player with multiple room accounts and returns all accounts', () => {
    const saved = db.savePlayer(basePlayer({
      accounts: [
        { roomName: 'RedStar', roomUsername: 'redstar test1' },
        { roomName: 'Nexa', roomUsername: 'nexa test1', roomPlayerId: 'NX-1', email: 'test1@example.com' }
      ]
    }))

    expect(saved.success).toBe(true)
    expect(saved.id).toBeTypeOf('number')

    const player = db.getPlayerById(saved.id!)
    expect(player?.accounts).toHaveLength(2)
    expect(player?.accounts.map((account) => account.room_name).sort()).toEqual(['Nexa', 'RedStar'])
  })

  it('blocks adding a duplicate contact instead of overwriting the existing player', () => {
    const first = db.savePlayer(basePlayer())
    const duplicate = db.savePlayer(basePlayer({
      accounts: [
        { roomName: 'RedStar', roomUsername: 'redstar test22' }
      ]
    }))

    expect(first.success).toBe(true)
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toContain('уже привязан')

    const player = db.getPlayerById(first.id!)
    expect(player?.accounts).toHaveLength(1)
    expect(player?.accounts[0].room_username).toBe('redstar test1')
  })

  it('blocks duplicate contacts case-insensitively', () => {
    const first = db.savePlayer(basePlayer({
      contacts: [{ contactMethod: 'TG', contactValue: '@Test1' }]
    }))
    const duplicate = db.savePlayer(basePlayer({
      messenger_username: '@test1',
      contacts: [{ contactMethod: 'TG', contactValue: '@test1' }]
    }))

    expect(first.success).toBe(true)
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toContain('уже привязан')
  })

  it('lets the same player be edited without tripping duplicate contact checks', () => {
    const saved = db.savePlayer(basePlayer())
    const edited = db.savePlayer(basePlayer({
      id: saved.id,
      default_wallet: 'TNEW',
      default_wallet_network: 'USDT TRC20',
      accounts: [
        { roomName: 'RedStar', roomUsername: 'redstar updated' },
        { roomName: 'Champion Poker', roomUsername: 'champ test1', email: 'test1@example.com' }
      ]
    }))

    expect(edited.success).toBe(true)

    const player = db.getPlayerById(saved.id!)
    expect(player?.player.default_wallet).toBe('TNEW')
    expect(player?.player.default_wallet_network).toBe('USDT TRC20')
    expect(player?.accounts).toHaveLength(2)
    expect(player?.accounts.find((account) => account.room_name === 'RedStar')?.room_username).toBe('redstar updated')
  })

  it('searches by partial username and every saved messenger contact', () => {
    const saved = db.savePlayer(basePlayer({
      messenger_username: '@anton',
      contacts: [
        { contactMethod: 'TG', contactValue: '@anton' },
        { contactMethod: 'WA', contactValue: '+5491112345678' },
        { contactMethod: 'Discord', contactValue: 'Anton + WPD support' }
      ]
    }))

    expect(saved.success).toBe(true)
    expect(db.searchPlayer('anto')).not.toBeNull()
    expect(db.searchPlayer('123456')).not.toBeNull()
    expect(db.searchPlayer('wpd')).not.toBeNull()
  })

  it('normalizes hidden WhatsApp characters while keeping contacts searchable', () => {
    const dirtyWhatsapp = '\u202A+55\u00A048\u00A099663\u20110764\u202C'
    const cleanWhatsapp = '+55 48 99663-0764'
    const saved = db.savePlayer(basePlayer({
      messenger_username: dirtyWhatsapp,
      contact_method: 'WA',
      contacts: [
        { contactMethod: 'WA', contactValue: dirtyWhatsapp }
      ]
    }))

    expect(saved.success).toBe(true)

    const player = db.getPlayerById(saved.id!)
    expect(player?.player.messenger_username).toBe(cleanWhatsapp)
    expect(player?.contacts[0].contact_value).toBe(cleanWhatsapp)
    expect(db.searchPlayer(dirtyWhatsapp)).not.toBeNull()
    expect(db.searchPlayer(cleanWhatsapp)).not.toBeNull()
  })

  it('blocks duplicate contacts that only differ by hidden WhatsApp characters', () => {
    const dirtyWhatsapp = '\u202A+55\u00A048\u00A099663\u20110764\u202C'
    const cleanWhatsapp = '+55 48 99663-0764'
    const first = db.savePlayer(basePlayer({
      messenger_username: cleanWhatsapp,
      contact_method: 'WA',
      contacts: [{ contactMethod: 'WA', contactValue: cleanWhatsapp }]
    }))
    const duplicate = db.savePlayer(basePlayer({
      messenger_username: dirtyWhatsapp,
      contact_method: 'WA',
      contacts: [{ contactMethod: 'WA', contactValue: dirtyWhatsapp }]
    }))

    expect(first.success).toBe(true)
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toContain('уже привязан')
  })

  it('finds existing dirty WhatsApp contacts with a clean query', () => {
    db.close()
    const dbPath = path.join(tempDir, 'transactioner.db')
    const raw = new Database(dbPath)
    const dirtyWhatsapp = '\u202A+55\u00A048\u00A099663\u20110764\u202C'
    const cleanWhatsapp = '+55 48 99663-0764'
    raw.prepare('INSERT INTO players (messenger_username, contact_method) VALUES (?, ?)').run(dirtyWhatsapp, 'WA')
    const playerId = Number(raw.prepare('SELECT last_insert_rowid() AS id').get().id)
    raw.prepare('INSERT INTO player_contacts (player_id, contact_method, contact_value, is_primary) VALUES (?, ?, ?, 1)').run(playerId, 'WA', dirtyWhatsapp)
    raw.close()

    db = new TransactionerDatabase(dbPath)

    expect(db.searchPlayer(cleanWhatsapp)).not.toBeNull()
    expect(db.searchPlayer(dirtyWhatsapp)).not.toBeNull()
  })

  it('uses the selected primary messenger as the default contact in returned payloads', () => {
    const saved = db.savePlayer(basePlayer({
      contacts: [
        { contactMethod: 'TG', contactValue: '@anton' },
        { contactMethod: 'WA', contactValue: '+5491112345678', isPrimary: true },
        { contactMethod: 'Discord', contactValue: 'Anton + WPD support' }
      ]
    }))

    expect(saved.success).toBe(true)

    const player = db.getPlayerById(saved.id!)
    expect(player?.player.contact_method).toBe('WA')
    expect(player?.player.messenger_username).toBe('+5491112345678')
    expect(player?.contacts[0].contact_method).toBe('WA')
    expect(player?.contacts[0].is_primary).toBe(1)
  })

  it('updates default wallet details without mutating other player fields', () => {
    const saved = db.savePlayer(basePlayer({
      default_wallet: 'TOLD',
      default_wallet_network: 'TRX'
    }))

    const update = db.updateDefaultWalletDetails(saved.id!, ' TNEW ', ' USDT TRC20 ')
    const player = db.getPlayerById(saved.id!)

    expect(update.success).toBe(true)
    expect(player?.player.default_wallet).toBe('TNEW')
    expect(player?.player.default_wallet_network).toBe('USDT TRC20')
    expect(player?.accounts[0].room_username).toBe('redstar test1')
  })

  it('deletes player contacts and room accounts with the player', () => {
    const saved = db.savePlayer(basePlayer({
      contacts: [
        { contactMethod: 'TG', contactValue: '@test1' },
        { contactMethod: 'Email', contactValue: 'test1@example.com' }
      ]
    }))

    expect(db.deletePlayer(saved.id!).success).toBe(true)
    expect(db.getPlayerById(saved.id!)).toBeNull()
    expect(db.searchPlayer('test1')).toBeNull()
  })

  it('migrates legacy primary contacts into the searchable contacts table', () => {
    db.close()
    const dbPath = path.join(tempDir, 'legacy.db')
    const legacy = new Database(dbPath)
    legacy.exec(`
      CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messenger_username TEXT NOT NULL,
        contact_method TEXT NOT NULL DEFAULT 'TG',
        default_wallet TEXT,
        default_wallet_network TEXT,
        last_used_at INTEGER DEFAULT 0
      );
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        room_name TEXT NOT NULL,
        room_username TEXT,
        room_player_id TEXT,
        email TEXT
      );
      CREATE TABLE player_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        contact_method TEXT NOT NULL,
        contact_value TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        UNIQUE(contact_method, contact_value)
      );
      INSERT INTO players (messenger_username, contact_method) VALUES ('@legacy', 'TG');
    `)
    legacy.close()

    const migrated = new TransactionerDatabase(dbPath)
    const result = migrated.searchPlayer('legacy')
    migrated.close()

    expect(result).not.toBeNull()
  })

  it('surfaces legacy duplicate primary contacts instead of dropping one during migration', () => {
    db.close()
    const dbPath = path.join(tempDir, 'duplicates.db')
    const legacy = new Database(dbPath)
    legacy.exec(`
      CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messenger_username TEXT NOT NULL,
        contact_method TEXT NOT NULL DEFAULT 'TG',
        default_wallet TEXT,
        default_wallet_network TEXT,
        last_used_at INTEGER DEFAULT 0
      );
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        room_name TEXT NOT NULL,
        room_username TEXT,
        room_player_id TEXT,
        email TEXT
      );
      CREATE TABLE player_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        contact_method TEXT NOT NULL,
        contact_value TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        UNIQUE(contact_method, contact_value)
      );
      INSERT INTO players (messenger_username, contact_method) VALUES ('@Test1', 'TG');
      INSERT INTO players (messenger_username, contact_method) VALUES ('@test1', 'TG');
    `)
    legacy.close()

    expect(() => new TransactionerDatabase(dbPath)).toThrow('duplicate players')
  })
})
