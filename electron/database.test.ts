import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { TransactionerDatabase, type SaveLinkVerificationTemplateInput, type SavePlayerInput } from './database'

let tempDir = ''
let dbPath = ''
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

const baseLinkVerificationTemplate = (
  overrides: Partial<SaveLinkVerificationTemplateInput> = {}
): SaveLinkVerificationTemplateInput => ({
  room_name: 'Nexa',
  template_key: 'nexa',
  label: 'Nexa messenger',
  channel: 'messenger',
  body: 'Проверка <player_data>',
  recipient_email: null,
  cc_emails: ['first@example.com', ' second@example.com ', ''],
  notes: 'Тестовый шаблон',
  ...overrides,
})

beforeEach(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'transactioner-db-'))
  dbPath = path.join(tempDir, 'transactioner.db')
  db = new TransactionerDatabase(dbPath)
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
  it('validates required link-verification template fields', () => {
    expect(db.getLinkVerificationTemplates('')).toEqual([])
    expect(db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({ room_name: '' }))).toEqual({
      success: false,
      error: 'Выберите рум'
    })
    expect(db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({ template_key: '' }))).toEqual({
      success: false,
      error: 'Выберите шаблон'
    })
    expect(db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({ label: '' }))).toEqual({
      success: false,
      error: 'Заполните название шаблона'
    })
    expect(db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({ body: '' }))).toEqual({
      success: false,
      error: 'Заполните текст шаблона'
    })
  })

  it('saves and loads a normalized link-verification template', () => {
    const saved = db.saveLinkVerificationTemplate(baseLinkVerificationTemplate())

    expect(saved.success).toBe(true)
    expect(saved.id).toBeTypeOf('number')
    expect(db.getLinkVerificationTemplates('nexa')).toEqual([
      expect.objectContaining({
        id: saved.id,
        room_name: 'Nexa',
        template_key: 'nexa',
        label: 'Nexa messenger',
        channel: 'messenger',
        body: 'Проверка <player_data>',
        recipient_email: null,
        cc_emails: 'first@example.com,second@example.com',
        notes: 'Тестовый шаблон',
      })
    ])
  })

  it('upserts and updates link-verification templates without changing their id', () => {
    const inserted = db.saveLinkVerificationTemplate(baseLinkVerificationTemplate())
    const second = db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({
      room_name: 'RedStar',
      template_key: 'redstar',
      label: 'RedStar',
    }))
    const upserted = db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({
      room_name: 'nexa',
      template_key: 'NEXA',
      channel: 'email',
      label: 'Nexa email',
      body: 'Email <email>',
      recipient_email: ' support@example.com ',
      cc_emails: 'copy@example.com',
    }))

    expect(second.success).toBe(true)
    expect(second.id).not.toBe(inserted.id)
    expect(upserted).toEqual({ success: true, id: inserted.id })

    const updated = db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({
      id: inserted.id,
      label: 'Nexa edited',
      body: 'Edited <player_data>',
      cc_emails: null,
    }))

    expect(updated).toEqual({ success: true, id: inserted.id })
    expect(db.getLinkVerificationTemplates('NEXA')).toEqual([
      expect.objectContaining({
        id: inserted.id,
        label: 'Nexa edited',
        body: 'Edited <player_data>',
        cc_emails: null,
      })
    ])
    expect(db.saveLinkVerificationTemplate(baseLinkVerificationTemplate({ id: 999999 }))).toEqual({
      success: false,
      error: 'Шаблон не найден'
    })
  })

  it('deletes link-verification template overrides and rejects incomplete keys', () => {
    db.saveLinkVerificationTemplate(baseLinkVerificationTemplate())

    expect(db.deleteLinkVerificationTemplate('', 'nexa')).toEqual({
      success: false,
      error: 'Шаблон не найден'
    })
    expect(db.deleteLinkVerificationTemplate('Nexa', '')).toEqual({
      success: false,
      error: 'Шаблон не найден'
    })
    expect(db.deleteLinkVerificationTemplate('nexa', 'NEXA')).toEqual({ success: true })
    expect(db.getLinkVerificationTemplates('Nexa')).toEqual([])
  })

  it('returns mutation errors when link-verification template storage is unavailable', () => {
    db.close()

    expect(db.saveLinkVerificationTemplate(baseLinkVerificationTemplate())).toEqual(expect.objectContaining({
      success: false,
      error: expect.any(String),
    }))
    expect(db.deleteLinkVerificationTemplate('Nexa', 'nexa')).toEqual(expect.objectContaining({
      success: false,
      error: expect.any(String),
    }))
  })

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

  it('counts room registrations from saved accounts for room ordering', () => {
    const first = db.savePlayer(basePlayer({
      messenger_username: '@test1',
      contacts: [{ contactMethod: 'TG', contactValue: '@test1' }],
      accounts: [
        { roomName: 'RedStar', roomUsername: 'redstar test1' },
        { roomName: 'Nexa', roomUsername: 'nexa test1' }
      ]
    }))
    const second = db.savePlayer(basePlayer({
      messenger_username: '@test2',
      contacts: [{ contactMethod: 'TG', contactValue: '@test2' }],
      accounts: [
        { roomName: 'Nexa', roomUsername: 'nexa test2' },
        { roomName: 'ACR', roomUsername: 'acr test2' }
      ]
    }))
    const third = db.savePlayer(basePlayer({
      messenger_username: '@test3',
      contacts: [{ contactMethod: 'TG', contactValue: '@test3' }],
      accounts: [
        { roomName: 'Nexa', roomUsername: 'nexa test3' }
      ]
    }))

    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(third.success).toBe(true)
    expect(db.getRoomRegistrationStats()).toEqual([
      { roomName: 'Nexa', registrationCount: 3 },
      { roomName: 'ACR', registrationCount: 1 },
      { roomName: 'RedStar', registrationCount: 1 }
    ])
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

  it('blocks duplicate contact values across different messenger methods', () => {
    const first = db.savePlayer(basePlayer({
      messenger_username: '+123',
      contact_method: 'TG',
      contacts: [{ contactMethod: 'TG', contactValue: '+123' }],
      accounts: [{ roomName: 'RedStar', roomUsername: 'tg player' }]
    }))
    const duplicate = db.savePlayer(basePlayer({
      messenger_username: '+123',
      contact_method: 'WA',
      contacts: [{ contactMethod: 'WA', contactValue: '+123' }],
      accounts: [{ roomName: 'RedStar', roomUsername: 'wa player' }]
    }))

    expect(first.success).toBe(true)
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toContain('уже привязан')

    const player = db.getPlayerById(first.id!)
    expect(player?.player.contact_method).toBe('TG')
    expect(player?.accounts[0].room_username).toBe('tg player')
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

  it('prefers an exact saved chat name over unrelated fuzzy room matches', () => {
    const target = db.savePlayer(basePlayer({
      messenger_username: 'T H',
      contacts: [
        { contactMethod: 'TG', contactValue: 'T H' },
        { contactMethod: 'TG', contactValue: 'Алексей + WPD support' }
      ],
      accounts: []
    }))
    const distractor = db.savePlayer(basePlayer({
      messenger_username: '@other',
      contacts: [{ contactMethod: 'TG', contactValue: '@other' }],
      accounts: [{ roomName: 'PokerKing', roomUsername: 'unrelated' }]
    }))

    expect(target.success).toBe(true)
    expect(distractor.success).toBe(true)
    expect(db.searchPlayer('T H')).toMatchObject({
      player: {
        id: target.id,
        messenger_username: 'T H'
      }
    })
  })

  it('prefers an exact secondary chat name over unrelated fuzzy room matches', () => {
    const target = db.savePlayer(basePlayer({
      messenger_username: '@target',
      contacts: [
        { contactMethod: 'TG', contactValue: '@target' },
        { contactMethod: 'TG', contactValue: 'T H' }
      ],
      accounts: []
    }))
    const distractor = db.savePlayer(basePlayer({
      messenger_username: '@other',
      contacts: [{ contactMethod: 'TG', contactValue: '@other' }],
      accounts: [{ roomName: 'PokerKing', roomUsername: 'unrelated' }]
    }))

    expect(target.success).toBe(true)
    expect(distractor.success).toBe(true)
    expect(db.searchPlayer('T H')).toMatchObject({
      player: {
        id: target.id,
        messenger_username: '@target'
      }
    })
  })

  it('keeps layout and transliteration matches when there is no exact saved contact', () => {
    const literal = db.savePlayer(basePlayer({
      messenger_username: '@anton',
      contacts: [{ contactMethod: 'TG', contactValue: '@anton' }],
      accounts: []
    }))
    const transliterated = db.savePlayer(basePlayer({
      messenger_username: '@other',
      contacts: [
        { contactMethod: 'TG', contactValue: '@other' },
        { contactMethod: 'Discord', contactValue: 'Антон Support' }
      ],
      accounts: []
    }))

    expect(literal.success).toBe(true)
    expect(transliterated.success).toBe(true)

    const result = db.searchPlayer('anton')
    expect(Array.isArray(result)).toBe(true)
    const resultIds = Array.isArray(result)
      ? result.map((player) => player.player.id)
      : []
    expect(resultIds).toEqual(
      expect.arrayContaining([literal.id, transliterated.id])
    )
  })

  it('searches by room usernames and room player ids', () => {
    const saved = db.savePlayer(basePlayer({
      messenger_username: '@roomsearch',
      contacts: [{ contactMethod: 'TG', contactValue: '@roomsearch' }],
      accounts: [
        { roomName: 'Nexa', roomUsername: 'Maldoror', roomPlayerId: '217811', email: '' }
      ]
    }))

    expect(saved.success).toBe(true)
    expect(db.searchPlayer('mald')).not.toBeNull()
    expect(db.searchPlayer('2178')).not.toBeNull()
  })

  it('searches player data across keyboard layouts and transliteration', () => {
    const saved = db.savePlayer(basePlayer({
      messenger_username: '@anton_wpd',
      contacts: [
        { contactMethod: 'TG', contactValue: '@anton_wpd' },
        { contactMethod: 'Discord', contactValue: 'Антон Support' }
      ],
      accounts: [
        { roomName: 'RedStar', roomUsername: 'Maldoror', roomPlayerId: '217811', email: '' },
        { roomName: 'WPT Global', roomUsername: 'AntonWPD', roomPlayerId: '317811', email: '' }
      ]
    }))

    expect(saved.success).toBe(true)
    expect(db.searchPlayer('фтещт')).not.toBeNull()
    expect(db.searchPlayer('anton support')).not.toBeNull()
    expect(db.searchPlayer('antonwpd')).not.toBeNull()
    expect(db.searchPlayer('ред стар')).not.toBeNull()
    expect(db.searchPlayer('впт')).not.toBeNull()
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

  it('rejects a transaction hash in every wallet persistence path', () => {
    const transactionHash = '0xdf8f94418d9cda8e30fd00ad8b1e91a7708ec841691ed708f49ebc438a7e325a'
    const expectedError = expect.stringContaining('хеш')

    const createWithHash = db.savePlayer(basePlayer({
      messenger_username: '@hash-on-create',
      contacts: [{ contactMethod: 'TG', contactValue: '@hash-on-create' }],
      default_wallet: transactionHash,
    }))
    expect(createWithHash).toEqual({ success: false, error: expectedError })
    expect(db.searchPlayer('@hash-on-create')).toBeNull()

    const saved = db.savePlayer(basePlayer())
    expect(saved.success).toBe(true)

    expect(db.updateDefaultWallet(saved.id!, transactionHash)).toEqual({
      success: false,
      error: expectedError,
    })
    expect(db.updateDefaultWalletDetails(saved.id!, transactionHash, 'USDT ERC20')).toEqual({
      success: false,
      error: expectedError,
    })
    expect(db.getPlayerById(saved.id!)?.player.default_wallet).toBeFalsy()

    expect(db.saveRoomWallet({
      room_key: 'redstar',
      deal_type: 'General',
      currency: 'USDT',
      network: 'ERC20',
      wallet_address: transactionHash,
      is_active: 1,
      sort_order: 10,
    })).toEqual({
      success: false,
      error: expectedError,
    })
    expect(db.getRoomWallets('redstar', 'General')).toHaveLength(0)
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

  it('surfaces legacy duplicate primary contact values across methods during migration', () => {
    db.close()
    const dbPath = path.join(tempDir, 'cross-method-duplicates.db')
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
      INSERT INTO players (messenger_username, contact_method) VALUES ('+123', 'TG');
      INSERT INTO players (messenger_username, contact_method) VALUES ('+123', 'WA');
    `)
    legacy.close()

    expect(() => new TransactionerDatabase(dbPath)).toThrow('duplicate players')
  })

  it('creates room knowledge tables and seeds initial room data idempotently', () => {
    const firstIndex = db.getRoomKnowledgeIndex()

    expect(firstIndex.profiles.map((profile) => profile.room_key).sort()).toEqual([
      'champion-poker',
      'nexa',
      'redstar'
    ])
    const championMethods = firstIndex.paymentMethods.filter((method) => method.room_key === 'champion-poker')
    expect(championMethods).toHaveLength(12)
    expect(championMethods.some((method) => (
      method.operation_type === 'Deposit' &&
      method.method_name === 'BTC / TRC20 / ERC20 / Skrill'
    ))).toBe(false)
    expect(championMethods).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation_type: 'Withdrawal',
        method_name: 'USDT TRC20',
        currency: 'USDT',
        network: 'TRC20',
        limits_text: '200 EUR',
      }),
      expect.objectContaining({
        operation_type: 'Withdrawal',
        method_name: 'BTC',
        currency: 'BTC',
        limits_text: '500 EUR',
      }),
      expect.objectContaining({
        operation_type: 'Deposit',
        method_name: 'USDC ERC20',
        currency: 'USDC',
        network: 'ERC20',
      }),
    ]))
    expect(firstIndex.dealOptions.filter((deal) => deal.room_key === 'nexa')).toEqual([
      { room_key: 'nexa', deal_type: 'Agent', language: 'RU' },
      { room_key: 'nexa', deal_type: 'Agent', language: 'EN' },
    ])
    expect(firstIndex.walletOptions.filter((wallet) => wallet.room_key === 'nexa')).toHaveLength(0)
    const nexaDepositMethods = firstIndex.paymentMethods.filter((method) => (
      method.room_key === 'nexa' &&
      method.deal_type === 'Agent' &&
      method.operation_type === 'Deposit'
    ))
    expect(nexaDepositMethods).toEqual(expect.arrayContaining([
      expect.objectContaining({ method_name: 'USDT TRC20', currency: 'USDT', network: 'TRC20' }),
      expect.objectContaining({ method_name: 'USDT BEP20', currency: 'USDT', network: 'BEP20' }),
      expect.objectContaining({ method_name: 'USDC ERC20', currency: 'USDC', network: 'ERC20' }),
      expect.objectContaining({ method_name: 'BTC', currency: 'BTC', network: 'BTC' }),
    ]))
    expect(nexaDepositMethods.some((method) => method.method_name === 'USDT / USDC / BTC')).toBe(false)
    expect(db.getRoomDeals('champion-poker', 'RU', 'Agent')[0].full_text).toContain('https://online.championpoker.com/promoRedirect')
    expect(db.getRoomDeals('champion-poker', 'EN', 'Direct')[0].full_text).toContain('https://online.championpoker.com/promoRedirect')
    expect(db.getRoomDeals('redstar', 'RU', 'General')[0].full_text).toContain('WPDEALS')
    expect(db.getRoomDeals('redstar', 'EN', 'General')[0].full_text).toContain('https://c.rsppartners.com/clickthrgh')

    db.close()
    db = new TransactionerDatabase(dbPath)
    const secondIndex = db.getRoomKnowledgeIndex()

    expect(secondIndex.profiles.filter((profile) => profile.room_key === 'champion-poker')).toHaveLength(1)
    expect(secondIndex.paymentMethods.filter((method) => method.room_key === 'champion-poker')).toHaveLength(12)
  })

  it('keeps admin-edited room deals after reinitializing seed data', () => {
    const deal = db.getRoomDeals('redstar', 'RU', 'General')[0]
    const result = db.saveRoomDeal({
      id: deal.id,
      room_key: deal.room_key,
      deal_type: deal.deal_type,
      language: deal.language,
      short_text: 'Manual short RedStar',
      full_text: 'Manual full RedStar',
      is_active: 1,
      sort_order: deal.sort_order,
    })

    expect(result.success).toBe(true)

    db.close()
    db = new TransactionerDatabase(dbPath)

    const savedDeal = db.getRoomDeals('redstar', 'RU', 'General')[0]
    expect(savedDeal.short_text).toBe('Manual short RedStar')
    expect(savedDeal.full_text).toBe('Manual full RedStar')
  })

  it('creates new rooms and lets admins add the first deal template', () => {
    const createdRoom = db.saveRoomProfile({
      room_key: 'new-room',
      display_name: 'New Room',
      network_name: 'Test Network',
      notes: 'Created from admin',
      is_active: 1,
    })

    expect(createdRoom.success).toBe(true)

    const createdDeal = db.saveRoomDeal({
      room_key: 'new-room',
      deal_type: 'Agent',
      language: 'RU',
      short_text: 'Короткая сделка New Room',
      full_text: 'Полный шаблон New Room',
      is_active: 1,
      sort_order: 0,
    })

    expect(createdDeal.success).toBe(true)

    const index = db.getRoomKnowledgeIndex()
    const savedDeal = db.getRoomDeals('new-room', 'RU', 'Agent')[0]

    expect(index.profiles.some((profile) => profile.room_key === 'new-room')).toBe(true)
    expect(index.dealOptions).toContainEqual({ room_key: 'new-room', deal_type: 'Agent', language: 'RU' })
    expect(savedDeal.short_text).toBe('Короткая сделка New Room')
  })

  it('rejects invalid room keys in admin room creation', () => {
    const result = db.saveRoomProfile({
      room_key: 'Bad Room!',
      display_name: 'Bad Room',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('латиницу')
  })

  it('hides inactive rooms from public room info while keeping them in admin', () => {
    const createdRoom = db.saveRoomProfile({
      room_key: 'hidden-room',
      display_name: 'Hidden Room',
      is_active: 0,
    })

    expect(createdRoom.success).toBe(true)
    expect(db.getRoomKnowledgeIndex().profiles.some((profile) => profile.room_key === 'hidden-room')).toBe(false)
    expect(db.getRoomKnowledgeAdminIndex().profiles.some((profile) => profile.room_key === 'hidden-room')).toBe(true)
  })

  it('does not seed default wallets into a new database', () => {
    expect(db.getRoomWallets('redstar', 'General')).toHaveLength(0)
    expect(db.getRoomWallets('nexa', 'Agent')).toHaveLength(0)
    expect(db.getRoomWallets('champion-poker', 'Agent')).toHaveLength(0)
  })

  it('saves room wallet edits and new wallet rows', () => {
    const createdInitial = db.saveRoomWallet({
      room_key: 'redstar',
      deal_type: 'General',
      currency: 'USDT',
      network: 'ERC20',
      wallet_address: '0xinitial',
      note: 'Initial admin wallet',
      is_active: 1,
      sort_order: 10,
    })
    expect(createdInitial.success).toBe(true)

    const wallet = db.getRoomWallets('redstar', 'General')[0]
    const edited = db.saveRoomWallet({
      id: wallet.id,
      room_key: wallet.room_key,
      deal_type: wallet.deal_type,
      currency: wallet.currency,
      network: wallet.network,
      wallet_address: '0xedited',
      note: 'Edited in admin',
      is_active: 1,
      sort_order: wallet.sort_order,
    })

    expect(edited.success).toBe(true)
    expect(db.getRoomWallets('redstar', 'General')[0].wallet_address).toBe('0xedited')

    const created = db.saveRoomWallet({
      room_key: 'redstar',
      deal_type: 'General',
      currency: 'USDC',
      network: 'ERC20',
      wallet_address: '0xnew-usdc',
      note: 'New admin wallet',
      is_active: 1,
      sort_order: 999,
    })

    expect(created.success).toBe(true)
    expect(db.getRoomWallets('redstar', 'General').some((row) => row.wallet_address === '0xnew-usdc')).toBe(true)

    const deleted = db.deleteRoomWallet(Number(created.id))
    expect(deleted.success).toBe(true)
    expect(db.getRoomWallets('redstar', 'General').some((row) => row.wallet_address === '0xnew-usdc')).toBe(false)
  })

  it('allows the same wallet address to be configured separately for different rooms', () => {
    const sharedAddress = 'TSharedOperationalWallet'
    const nexa = db.saveRoomWallet({
      room_key: 'nexa',
      deal_type: 'Agent',
      currency: 'USDT',
      network: 'TRC20',
      wallet_address: sharedAddress,
      note: 'Nexa shared wallet config',
      is_active: 1,
      sort_order: 10,
    })
    const champion = db.saveRoomWallet({
      room_key: 'champion-poker',
      deal_type: 'Agent',
      currency: 'USDT',
      network: 'TRC20',
      wallet_address: sharedAddress,
      note: 'Champion shared wallet config',
      is_active: 1,
      sort_order: 20,
    })

    expect(nexa.success).toBe(true)
    expect(champion.success).toBe(true)
    expect(nexa.id).not.toBe(champion.id)
    expect(db.getRoomWallets('nexa', 'Agent').map((row) => row.note)).toEqual(['Nexa shared wallet config'])
    expect(db.getRoomWallets('champion-poker', 'Agent').map((row) => row.note)).toEqual(['Champion shared wallet config'])
  })

  it('keeps manually created wallets after reinitializing seed data', () => {
    const created = db.saveRoomWallet({
      room_key: 'nexa',
      deal_type: 'Agent',
      currency: 'USDT',
      network: 'TRC20',
      wallet_address: 'TEditedNexaTrc20Wallet',
      note: 'Manual operator wallet',
      is_active: 1,
      sort_order: 10,
    })

    expect(created.success).toBe(true)

    db.close()
    db = new TransactionerDatabase(dbPath)

    const trc20Wallets = db.getRoomWallets('nexa', 'Agent').filter((row) => (
      row.currency === 'USDT' && row.network === 'TRC20'
    ))
    expect(trc20Wallets.map((row) => row.wallet_address)).toEqual(['TEditedNexaTrc20Wallet'])
    expect(trc20Wallets[0].note).toBe('Manual operator wallet')
  })

  it('clears existing wallets once for manual wallet reconfiguration', () => {
    db.close()
    const raw = new Database(dbPath)
    raw.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (?, 'done')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run('room_wallets_manual_reset_2026_07_02')
    raw.prepare('DELETE FROM app_settings WHERE key = ?').run('room_wallets_manual_reset_2026_07_02_v2')
    raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, note, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('redstar', 'General', 'USDT', 'ERC20', '0xlegacy-redstar-erc20', 'Legacy wallet', 1, 60)
    raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, note, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('champion-poker', 'Agent', 'USDT', 'TRC20', 'TlegacyChampionTrc20', 'Legacy wallet', 1, 10)
    raw.close()

    db = new TransactionerDatabase(dbPath)

    expect(db.getRoomWallets('redstar', 'General')).toHaveLength(0)
    expect(db.getRoomWallets('champion-poker', 'Agent')).toHaveLength(0)
    db.close()
    const migrated = new Database(dbPath)
    expect((
      migrated.prepare('SELECT value FROM app_settings WHERE key = ?')
        .get('room_wallets_manual_reset_2026_07_02_v2') as { value: string } | undefined
    )?.value).toBe('done')
    migrated.close()

    db = new TransactionerDatabase(dbPath)

    const created = db.saveRoomWallet({
      room_key: 'redstar',
      deal_type: 'General',
      currency: 'USDT',
      network: 'ERC20',
      wallet_address: '0xnew-manual-redstar-erc20',
      note: 'Manual wallet after reset',
      is_active: 1,
      sort_order: 10,
    })
    expect(created.success).toBe(true)

    db.close()
    db = new TransactionerDatabase(dbPath)

    expect(db.getRoomWallets('redstar', 'General').map((row) => row.wallet_address)).toEqual([
      '0xnew-manual-redstar-erc20',
    ])
  })

  it('saves editable room payment method limits and keeps inactive methods visible in admin', () => {
    const created = db.saveRoomPaymentMethod({
      room_key: 'redstar',
      deal_type: 'General',
      operation_type: 'Deposit',
      method_name: 'TEST RAIL',
      currency: 'TEST',
      network: 'RAIL',
      limits_text: 'min 200 TEST',
      is_active: 0,
      sort_order: 777,
    })

    expect(created.success).toBe(true)
    expect(db.getRoomKnowledgeIndex().paymentMethods.some((row) => row.id === created.id)).toBe(false)

    const adminMethod = db.getRoomKnowledgeAdminIndex().paymentMethods.find((row) => row.id === created.id)
    expect(adminMethod?.limits_text).toBe('min 200 TEST')
    expect(adminMethod?.is_active).toBe(0)

    const edited = db.saveRoomPaymentMethod({
      id: created.id,
      room_key: 'redstar',
      deal_type: 'General',
      operation_type: 'Deposit',
      method_name: 'TEST RAIL',
      currency: 'TEST',
      network: 'RAIL',
      limits_text: 'min 100 TEST',
      is_active: 1,
      sort_order: 777,
    })

    expect(edited.success).toBe(true)
    expect(db.getRoomKnowledgeIndex().paymentMethods.find((row) => row.id === created.id)?.limits_text).toBe('min 100 TEST')

    const deleted = db.deleteRoomPaymentMethod(Number(created.id))
    expect(deleted.success).toBe(true)
    expect(db.getRoomKnowledgeAdminIndex().paymentMethods.some((row) => row.id === created.id)).toBe(false)
  })

  it('updates method and wallet sort order without normalizing duplicate-looking legacy rows', () => {
    db.close()
    const raw = new Database(dbPath)
    const firstMethod = raw.prepare(`
      INSERT INTO room_payment_methods (
        room_key, deal_type, operation_type, method_name, currency, network, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('sort-room', 'Agent', 'Withdrawal', 'Skrill EUR', 'Skrill', 'EUR', 10, 1)
    raw.prepare(`
      INSERT INTO room_payment_methods (
        room_key, deal_type, operation_type, method_name, currency, network, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('sort-room', 'Agent', 'Withdrawal', 'Skrill EUR', 'SKRILL', 'EUR', 20, 1)
    const firstWallet = raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('sort-room', 'Agent', 'Skrill', 'EUR', 'legacy@example.com', 1, 10)
    raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('sort-room', 'Agent', 'SKRILL', 'EUR', 'manual@example.com', 1, 20)
    raw.close()

    db = new TransactionerDatabase(dbPath)

    expect(db.saveRoomPaymentMethod({
      id: Number(firstMethod.lastInsertRowid),
      room_key: 'sort-room',
      deal_type: 'Agent',
      operation_type: 'Withdrawal',
      method_name: 'Skrill EUR',
      currency: 'Skrill',
      network: 'EUR',
      sort_order: 30,
      sort_order_only: true,
    })).toEqual({ success: true, id: Number(firstMethod.lastInsertRowid) })
    expect(db.saveRoomWallet({
      id: Number(firstWallet.lastInsertRowid),
      room_key: 'sort-room',
      deal_type: 'Agent',
      currency: 'Skrill',
      network: 'EUR',
      wallet_address: 'legacy@example.com',
      sort_order: 30,
      sort_order_only: true,
    })).toEqual({ success: true, id: Number(firstWallet.lastInsertRowid) })

    const methods = db.getRoomKnowledgeAdminIndex().paymentMethods.filter((method) => (
      method.room_key === 'sort-room' && method.operation_type === 'Withdrawal'
    ))
    const wallets = db.getRoomWallets('sort-room', 'Agent')
    expect(methods.find((method) => method.id === Number(firstMethod.lastInsertRowid))?.sort_order).toBe(30)
    expect(methods.find((method) => method.id !== Number(firstMethod.lastInsertRowid))?.sort_order).toBe(20)
    expect(wallets.find((wallet) => wallet.id === Number(firstWallet.lastInsertRowid))?.sort_order).toBe(30)
    expect(wallets.find((wallet) => wallet.id !== Number(firstWallet.lastInsertRowid))?.sort_order).toBe(20)
  })

  it('returns active room deals filtered by room, language, and deal type', () => {
    db.close()
    const raw = new Database(dbPath)
    raw.prepare(`
      INSERT INTO room_deals (
        room_key, deal_type, language, short_text, full_text, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'General', 'RU', 'Коротко Test', 'Полный шаблон Test', 10, 1)
    raw.prepare(`
      INSERT INTO room_deals (
        room_key, deal_type, language, short_text, full_text, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'General', 'EN', 'Short Test', 'Full Test', 20, 1)
    raw.prepare(`
      INSERT INTO room_deals (
        room_key, deal_type, language, short_text, full_text, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'General', 'ES', 'Corto Test', 'Plantilla completa Test', 25, 1)
    raw.prepare(`
      INSERT INTO room_deals (
        room_key, deal_type, language, short_text, full_text, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'Agent', 'RU', 'Старый короткий', 'Старый полный', 30, 0)
    raw.close()

    db = new TransactionerDatabase(dbPath)
    const ruDeals = db.getRoomDeals('test-room', 'RU')
    const enDeals = db.getRoomDeals('test-room', 'EN', 'General')
    const esDeals = db.getRoomDeals('test-room', 'ES', 'General')

    expect(ruDeals).toHaveLength(1)
    expect(ruDeals[0].short_text).toBe('Коротко Test')
    expect(enDeals).toHaveLength(1)
    expect(enDeals[0].short_text).toBe('Short Test')
    expect(esDeals).toHaveLength(1)
    expect(esDeals[0].short_text).toBe('Corto Test')
  })

  it('returns room wallets filtered by room and deal type while preserving inactive rows for warnings', () => {
    db.close()
    const raw = new Database(dbPath)
    raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, fee_text, verified_at, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'General', 'USDT', 'ERC20', '0xactive', 'без комиссии', '2026-02-16', 1, 20)
    raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, fee_text, verified_at, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'General', 'USDT', 'ERC20', '0xactive-second', 'без комиссии', '2026-02-16', 1, 25)
    raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, fee_text, verified_at, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'General', 'USDT', 'TRC20', 'Tinactive', 'не актуально', '2025-05-25', 0, 10)
    raw.prepare(`
      INSERT INTO room_wallets (
        room_key, deal_type, currency, network, wallet_address, fee_text, verified_at, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'Agent', 'BTC', 'BTC', 'bc1agent', 'без комиссии', '2026-02-16', 1, 30)
    raw.close()

    db = new TransactionerDatabase(dbPath)
    const generalWallets = db.getRoomWallets('test-room', 'General')
    const agentWallets = db.getRoomWallets('test-room', 'Agent')

    expect(generalWallets).toHaveLength(3)
    expect(generalWallets.map((wallet) => wallet.wallet_address)).toEqual(['0xactive', '0xactive-second', 'Tinactive'])
    expect(generalWallets[2].is_active).toBe(0)
    expect(agentWallets).toHaveLength(1)
    expect(agentWallets[0].wallet_address).toBe('bc1agent')

    const migratedMethods = db.getRoomKnowledgeAdminIndex().paymentMethods.filter((method) => method.room_key === 'test-room')
    expect(migratedMethods).toEqual(expect.arrayContaining([
      expect.objectContaining({
        deal_type: 'General',
        operation_type: 'Deposit',
        method_name: 'USDT ERC20',
        currency: 'USDT',
        network: 'ERC20',
      }),
      expect.objectContaining({
        deal_type: 'Agent',
        operation_type: 'Deposit',
        method_name: 'BTC',
        currency: 'BTC',
        network: 'BTC',
      }),
    ]))
    expect(migratedMethods.filter((method) => (
      method.deal_type === 'General' &&
      method.operation_type === 'Deposit' &&
      method.currency === 'USDT' &&
      method.network === 'ERC20'
    ))).toHaveLength(1)
  })

  it('returns country availability rows for room deal filtering', () => {
    db.close()
    const raw = new Database(dbPath)
    raw.prepare(`
      INSERT INTO room_country_availability (
        room_key, country_code, country_name, status, deal_type, language, note, source_date, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'TH', 'Thailand', 'Available', 'Agent', 'RU', 'Only agent deal is available', '2026-05-31', 20, 1)
    raw.prepare(`
      INSERT INTO room_country_availability (
        room_key, country_code, country_name, status, deal_type, language, note, source_date, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-room', 'BR', 'Brazil', 'Unavailable', '', '', 'Room is not available', '2026-05-31', 10, 1)
    raw.close()

    db = new TransactionerDatabase(dbPath)
    const index = db.getRoomKnowledgeIndex()
    const availability = db.getRoomCountryAvailability('test-room')

    expect(index.countryOptions.filter((country) => country.room_key === 'test-room')).toHaveLength(2)
    expect(availability.map((country) => country.country_code)).toEqual(['BR', 'TH'])
    expect(availability[1].deal_type).toBe('Agent')
  })
})
