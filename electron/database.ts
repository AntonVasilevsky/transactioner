import Database from 'better-sqlite3'
import { contactSearchKey, normalizeContactText } from '../src/utils/contactNormalization'
import { roomKnowledgeSeed, type RoomKnowledgeSeed } from './roomKnowledgeSeed'

export type ContactMethod = 'TG' | 'WA' | 'Discord' | 'Teams' | 'Email'
export type RoomDealType = 'General' | 'Direct' | 'Agent'
export type RoomLanguage = 'RU' | 'EN'
export type RoomCountryStatus = 'Available' | 'Unavailable' | 'Check'

export interface AccountInput {
  roomName: string
  roomUsername?: string | null
  roomPlayerId?: string | null
  email?: string | null
}

export interface ContactInput {
  contactMethod: ContactMethod
  contactValue: string
  isPrimary?: boolean
}

export interface SavePlayerInput {
  id?: number
  messenger_username?: string
  contact_method?: ContactMethod
  contacts?: Array<Partial<ContactInput> & {
    contact_method?: ContactMethod
    contact_value?: string
    is_primary?: number
  }>
  default_wallet?: string | null
  default_wallet_network?: string | null
  accounts: AccountInput[]
}

export interface MutationResult {
  success: boolean
  error?: string
}

export interface SavePlayerResult extends MutationResult {
  id?: number
}

export interface RoomProfileInfo {
  id: number
  room_key: string
  display_name: string
  network_name?: string | null
  is_active: number
  notes?: string | null
}

export interface RoomDealInfo {
  id: number
  room_key: string
  deal_type: RoomDealType
  language: RoomLanguage
  short_text: string
  full_text: string
  registration_url?: string | null
  promo_code?: string | null
  registration_note?: string | null
  sort_order: number
  is_active: number
  updated_at?: string | null
}

export interface RoomPaymentMethodInfo {
  id: number
  room_key: string
  deal_type: RoomDealType
  operation_type: 'Deposit' | 'Withdrawal'
  method_name: string
  currency: string
  network: string
  fee_text?: string | null
  limits_text?: string | null
  note?: string | null
  sort_order: number
  is_active: number
}

export interface RoomWalletInfo {
  id: number
  room_key: string
  deal_type: RoomDealType
  currency: string
  network: string
  wallet_address: string
  memo_tag?: string | null
  fee_text?: string | null
  note?: string | null
  verified_at?: string | null
  is_active: number
  sort_order: number
}

export interface RoomCountryAvailabilityInfo {
  id: number
  room_key: string
  country_code: string
  country_name: string
  status: RoomCountryStatus
  deal_type: RoomDealType | ''
  language: RoomLanguage | ''
  note?: string | null
  source_date?: string | null
  sort_order: number
  is_active: number
}

export interface RoomKnowledgeIndex {
  profiles: RoomProfileInfo[]
  dealOptions: Array<{ room_key: string; deal_type: RoomDealType; language: RoomLanguage }>
  paymentMethods: RoomPaymentMethodInfo[]
  walletOptions: Array<{ room_key: string; deal_type: RoomDealType; currency: string; network: string; is_active: number }>
  countryOptions: RoomCountryAvailabilityInfo[]
}

interface DbPlayer {
  id: number
  messenger_username: string
  contact_method: ContactMethod
  default_wallet?: string | null
  default_wallet_network?: string | null
  last_used_at?: number
}

interface DbContact {
  id: number
  player_id: number
  contact_method: ContactMethod
  contact_value: string
  is_primary: number
}

interface DuplicateContactRow {
  method_key: string
  value_key: string
  player_ids: string
  duplicate_count: number
}

interface SearchPlayerRow extends DbPlayer {
  contact_summary?: string | null
  room_summary?: string | null
}

export class TransactionerDatabase {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.initialize()
  }

  close() {
    this.db.close()
  }

  searchPlayer(username: string) {
    const query = String(username || '').trim()
    if (!query) return null
    const queryKey = contactSearchKey(query)
    if (!queryKey) return null

    const players = (this.db.prepare(`
      SELECT
        p.*,
        GROUP_CONCAT(DISTINCT c.contact_value) AS contact_summary,
        GROUP_CONCAT(DISTINCT (a.room_name || ' ' || IFNULL(a.room_username, '') || ' ' || IFNULL(a.room_player_id, '') || ' ' || IFNULL(a.email, ''))) AS room_summary
      FROM players p
      LEFT JOIN player_contacts c ON c.player_id = p.id
      LEFT JOIN accounts a ON a.player_id = p.id
      GROUP BY p.id
    `).all() as SearchPlayerRow[])
      .filter((player) => contactSearchKey(`${player.messenger_username} ${player.contact_summary || ''} ${player.room_summary || ''}`).includes(queryKey))
      .sort((left, right) => {
        const leftExact = contactSearchKey(left.messenger_username) === queryKey ? 0 : 1
        const rightExact = contactSearchKey(right.messenger_username) === queryKey ? 0 : 1
        if (leftExact !== rightExact) return leftExact - rightExact
        if ((right.last_used_at || 0) !== (left.last_used_at || 0)) return (right.last_used_at || 0) - (left.last_used_at || 0)
        return left.messenger_username.localeCompare(right.messenger_username, undefined, { sensitivity: 'base' })
      })

    if (!players.length) return null

    const now = Date.now()
    players.forEach((player) => this.db.prepare('UPDATE players SET last_used_at = ? WHERE id = ?').run(now, player.id))
    const result = players.map((player) => this.getPlayerPayload(player))
    return result.length === 1 ? result[0] : result
  }

  getAllPlayers() {
    return this.db.prepare(`
      SELECT
        p.*,
        GROUP_CONCAT(DISTINCT c.contact_value) AS contact_summary,
        GROUP_CONCAT(DISTINCT (a.room_name || ' ' || IFNULL(a.room_username, '') || ' ' || IFNULL(a.room_player_id, '') || ' ' || IFNULL(a.email, ''))) AS room_summary
      FROM players p
      LEFT JOIN player_contacts c ON c.player_id = p.id
      LEFT JOIN accounts a ON a.player_id = p.id
      GROUP BY p.id
      ORDER BY p.last_used_at DESC
    `).all()
  }

  getPlayerById(id: number) {
    const player = this.db.prepare('SELECT * FROM players WHERE id = ?').get(id) as DbPlayer | undefined
    if (!player) return null
    return this.getPlayerPayload(player)
  }

  getRoomKnowledgeIndex(): RoomKnowledgeIndex {
    const profiles = this.db.prepare(`
      SELECT * FROM room_profiles
      WHERE is_active = 1
      ORDER BY display_name COLLATE NOCASE
    `).all() as RoomProfileInfo[]
    const dealOptions = this.db.prepare(`
      SELECT room_key, deal_type, language
      FROM room_deals
      WHERE is_active = 1
      ORDER BY room_key COLLATE NOCASE, sort_order, deal_type COLLATE NOCASE, language
    `).all() as RoomKnowledgeIndex['dealOptions']
    const paymentMethods = this.db.prepare(`
      SELECT * FROM room_payment_methods
      WHERE is_active = 1
      ORDER BY room_key COLLATE NOCASE, sort_order, operation_type, method_name COLLATE NOCASE
    `).all() as RoomPaymentMethodInfo[]
    const walletOptions = this.db.prepare(`
      SELECT room_key, deal_type, currency, network, is_active
      FROM room_wallets
      ORDER BY room_key COLLATE NOCASE, sort_order, currency COLLATE NOCASE, network COLLATE NOCASE
    `).all() as RoomKnowledgeIndex['walletOptions']
    const countryOptions = this.db.prepare(`
      SELECT * FROM room_country_availability
      WHERE is_active = 1
      ORDER BY room_key COLLATE NOCASE, sort_order, country_name COLLATE NOCASE, deal_type COLLATE NOCASE
    `).all() as RoomCountryAvailabilityInfo[]

    return { profiles, dealOptions, paymentMethods, walletOptions, countryOptions }
  }

  getRoomCountryAvailability(roomKey: string): RoomCountryAvailabilityInfo[] {
    const normalizedRoomKey = String(roomKey || '').trim()
    if (!normalizedRoomKey) return []

    return this.db.prepare(`
      SELECT * FROM room_country_availability
      WHERE room_key = ? COLLATE NOCASE
        AND is_active = 1
      ORDER BY sort_order, country_name COLLATE NOCASE, deal_type COLLATE NOCASE
    `).all(normalizedRoomKey) as RoomCountryAvailabilityInfo[]
  }

  getRoomWallets(roomKey: string, dealType?: RoomDealType): RoomWalletInfo[] {
    const normalizedRoomKey = String(roomKey || '').trim()
    if (!normalizedRoomKey) return []

    if (dealType) {
      return this.db.prepare(`
        SELECT * FROM room_wallets
        WHERE room_key = ? COLLATE NOCASE
          AND deal_type = ? COLLATE NOCASE
        ORDER BY is_active DESC, sort_order, currency COLLATE NOCASE, network COLLATE NOCASE
      `).all(normalizedRoomKey, dealType) as RoomWalletInfo[]
    }

    return this.db.prepare(`
      SELECT * FROM room_wallets
      WHERE room_key = ? COLLATE NOCASE
      ORDER BY is_active DESC, sort_order, deal_type COLLATE NOCASE, currency COLLATE NOCASE, network COLLATE NOCASE
    `).all(normalizedRoomKey) as RoomWalletInfo[]
  }

  getRoomDeals(roomKey: string, language: RoomLanguage, dealType?: RoomDealType): RoomDealInfo[] {
    const normalizedRoomKey = String(roomKey || '').trim()
    if (!normalizedRoomKey) return []

    if (dealType) {
      return this.db.prepare(`
        SELECT * FROM room_deals
        WHERE room_key = ? COLLATE NOCASE
          AND language = ? COLLATE NOCASE
          AND deal_type = ? COLLATE NOCASE
          AND is_active = 1
        ORDER BY sort_order, deal_type COLLATE NOCASE
      `).all(normalizedRoomKey, language, dealType) as RoomDealInfo[]
    }

    return this.db.prepare(`
      SELECT * FROM room_deals
      WHERE room_key = ? COLLATE NOCASE
        AND language = ? COLLATE NOCASE
        AND is_active = 1
      ORDER BY sort_order, deal_type COLLATE NOCASE
    `).all(normalizedRoomKey, language) as RoomDealInfo[]
  }

  deletePlayer(id: number): MutationResult {
    try {
      this.db.prepare('DELETE FROM player_contacts WHERE player_id = ?').run(id)
      this.db.prepare('DELETE FROM accounts WHERE player_id = ?').run(id)
      this.db.prepare('DELETE FROM players WHERE id = ?').run(id)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  savePlayer(data: SavePlayerInput): SavePlayerResult {
    try {
      const contacts = this.normalizeContacts(data)
      const primaryContact = contacts.find((contact) => contact.isPrimary) || contacts[0]
      const username = primaryContact?.contactValue || ''
      const contactMethod = primaryContact?.contactMethod || 'TG'
      const defaultWallet = data.default_wallet ? String(data.default_wallet).trim() : null
      const defaultWalletNetwork = data.default_wallet_network ? String(data.default_wallet_network).trim() : null
      const playerId = data.id ? Number(data.id) : null

      if (!username) {
        return { success: false, error: 'Добавьте хотя бы один контакт игрока' }
      }

      const savePlayer = this.db.transaction(() => {
        const seenContacts = new Set<string>()
        for (const contact of contacts) {
          const contactValueKey = contactSearchKey(contact.contactValue)
          if (seenContacts.has(contactValueKey)) {
            throw new Error(`Контакт ${contact.contactValue} указан несколько раз`)
          }
          seenContacts.add(contactValueKey)

          const existingContact = (this.db.prepare(`
            SELECT * FROM player_contacts
          `).all() as DbContact[])
            .find(existing => contactSearchKey(existing.contact_value) === contactValueKey)

          if (existingContact && (!playerId || existingContact.player_id !== playerId)) {
            throw new Error(`Контакт ${contact.contactValue} уже привязан к другому игроку`)
          }
        }

        const usernameKey = contactSearchKey(username)
        const existingPrimary = (this.db.prepare(`
          SELECT * FROM players
        `).all() as DbPlayer[])
          .find(existing => contactSearchKey(existing.messenger_username) === usernameKey)

        if (existingPrimary && (!playerId || existingPrimary.id !== playerId)) {
          throw new Error(`Игрок с контактом ${username} уже существует`)
        }

        let resolvedPlayerId = playerId
        if (resolvedPlayerId) {
          const current = this.db.prepare('SELECT * FROM players WHERE id = ?').get(resolvedPlayerId)
          if (!current) {
            throw new Error('Игрок не найден')
          }
          this.db.prepare(`
            UPDATE players
            SET messenger_username = ?, contact_method = ?, default_wallet = ?, default_wallet_network = ?
            WHERE id = ?
          `).run(username, contactMethod, defaultWallet, defaultWalletNetwork, resolvedPlayerId)
        } else {
          const result = this.db.prepare(`
            INSERT INTO players (messenger_username, contact_method, default_wallet, default_wallet_network)
            VALUES (?, ?, ?, ?)
          `).run(username, contactMethod, defaultWallet, defaultWalletNetwork)
          resolvedPlayerId = Number(result.lastInsertRowid)
        }

        const insertAccount = this.db.prepare(`
          INSERT INTO accounts (player_id, room_name, room_username, room_player_id, email)
          VALUES (@playerId, @roomName, @roomUsername, @roomPlayerId, @email)
        `)
        const insertContact = this.db.prepare(`
          INSERT INTO player_contacts (player_id, contact_method, contact_value, is_primary)
          VALUES (@playerId, @contactMethod, @contactValue, @isPrimary)
        `)
        this.db.prepare('DELETE FROM player_contacts WHERE player_id = ?').run(resolvedPlayerId)
        this.db.prepare('DELETE FROM accounts WHERE player_id = ?').run(resolvedPlayerId)

        for (const contact of contacts) {
          insertContact.run({
            playerId: resolvedPlayerId,
            contactMethod: contact.contactMethod,
            contactValue: contact.contactValue,
            isPrimary: contact === primaryContact ? 1 : 0
          })
        }

        for (const account of data.accounts) {
          insertAccount.run({
            playerId: resolvedPlayerId,
            roomName: account.roomName,
            roomUsername: account.roomUsername || null,
            roomPlayerId: account.roomPlayerId || null,
            email: account.email || null
          })
        }

        return resolvedPlayerId
      })

      const id = savePlayer()
      return { success: true, id }
    } catch (err: unknown) {
      console.error(err)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  updateDefaultWallet(id: number, wallet: string): MutationResult {
    try {
      const playerId = Number(id)
      const defaultWallet = wallet ? String(wallet).trim() : null
      const result = this.db.prepare('UPDATE players SET default_wallet = ? WHERE id = ?').run(defaultWallet, playerId)
      if (result.changes === 0) {
        return { success: false, error: 'Игрок не найден' }
      }
      return { success: true }
    } catch (err: unknown) {
      console.error(err)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  updateDefaultWalletDetails(id: number, wallet: string, network: string): MutationResult {
    try {
      const playerId = Number(id)
      const defaultWallet = wallet ? String(wallet).trim() : null
      const defaultWalletNetwork = network ? String(network).trim() : null
      const result = this.db.prepare(`
        UPDATE players
        SET default_wallet = ?, default_wallet_network = ?
        WHERE id = ?
      `).run(defaultWallet, defaultWalletNetwork, playerId)
      if (result.changes === 0) {
        return { success: false, error: 'Игрок не найден' }
      }
      return { success: true }
    } catch (err: unknown) {
      console.error(err)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messenger_username TEXT NOT NULL,
        contact_method TEXT NOT NULL DEFAULT 'TG',
        default_wallet TEXT,
        default_wallet_network TEXT,
        last_used_at INTEGER DEFAULT 0,
        UNIQUE(contact_method, messenger_username)
      );
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        room_name TEXT NOT NULL,
        room_username TEXT,
        room_player_id TEXT,
        email TEXT,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE TABLE IF NOT EXISTS player_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        contact_method TEXT NOT NULL,
        contact_value TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(player_id) REFERENCES players(id),
        UNIQUE(contact_method, contact_value)
      );
      CREATE TABLE IF NOT EXISTS room_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        network_name TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS room_deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_key TEXT NOT NULL,
        deal_type TEXT NOT NULL DEFAULT 'General',
        language TEXT NOT NULL,
        short_text TEXT NOT NULL,
        full_text TEXT NOT NULL,
        registration_url TEXT,
        promo_code TEXT,
        registration_note TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT,
        UNIQUE(room_key, deal_type, language)
      );
      CREATE TABLE IF NOT EXISTS room_payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_key TEXT NOT NULL,
        deal_type TEXT NOT NULL DEFAULT 'General',
        operation_type TEXT NOT NULL,
        method_name TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT '',
        network TEXT NOT NULL DEFAULT '',
        fee_text TEXT,
        limits_text TEXT,
        note TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(room_key, deal_type, operation_type, method_name, currency, network)
      );
      CREATE TABLE IF NOT EXISTS room_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_key TEXT NOT NULL,
        deal_type TEXT NOT NULL DEFAULT 'General',
        currency TEXT NOT NULL,
        network TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        memo_tag TEXT,
        fee_text TEXT,
        note TEXT,
        verified_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        UNIQUE(room_key, deal_type, currency, network, wallet_address)
      );
      CREATE TABLE IF NOT EXISTS room_country_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_key TEXT NOT NULL,
        country_code TEXT NOT NULL,
        country_name TEXT NOT NULL,
        status TEXT NOT NULL,
        deal_type TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT '',
        note TEXT,
        source_date TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(room_key, country_code, status, deal_type, language)
      );
    `)

    this.migrate()
  }

  private migrate() {
    const cols = this.db.prepare("PRAGMA table_info(players)").all() as Array<{ name: string }>
    const colNames = cols.map((c) => c.name)
    if (!colNames.includes('contact_method')) {
      this.db.exec(`ALTER TABLE players ADD COLUMN contact_method TEXT NOT NULL DEFAULT 'TG';`)
    }
    if (!colNames.includes('last_used_at')) {
      this.db.exec(`ALTER TABLE players ADD COLUMN last_used_at INTEGER DEFAULT 0;`)
    }
    if (!colNames.includes('default_wallet')) {
      this.db.exec(`ALTER TABLE players ADD COLUMN default_wallet TEXT;`)
    }
    if (!colNames.includes('default_wallet_network')) {
      this.db.exec(`ALTER TABLE players ADD COLUMN default_wallet_network TEXT;`)
    }
    this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_players_contact ON players(contact_method, messenger_username);`)
    this.migratePrimaryContacts()
    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_player_contacts_unique_nocase
      ON player_contacts(contact_method COLLATE NOCASE, contact_value COLLATE NOCASE);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_player_contacts_value_unique_nocase
      ON player_contacts(contact_value COLLATE NOCASE);
    `)
    this.seedRoomKnowledge(roomKnowledgeSeed)
  }

  private seedRoomKnowledge(seed: RoomKnowledgeSeed) {
    const seedRooms = this.db.transaction(() => {
      const insertProfile = this.db.prepare(`
        INSERT INTO room_profiles (room_key, display_name, network_name, is_active, notes)
        VALUES (@roomKey, @displayName, @networkName, @isActive, @notes)
        ON CONFLICT(room_key) DO UPDATE SET
          display_name = excluded.display_name,
          network_name = excluded.network_name,
          is_active = excluded.is_active,
          notes = excluded.notes
      `)
      const insertDeal = this.db.prepare(`
        INSERT INTO room_deals (
          room_key, deal_type, language, short_text, full_text, registration_url,
          promo_code, registration_note, sort_order, is_active, updated_at
        )
        VALUES (
          @roomKey, @dealType, @language, @shortText, @fullText, @registrationUrl,
          @promoCode, @registrationNote, @sortOrder, @isActive, @updatedAt
        )
        ON CONFLICT(room_key, deal_type, language) DO UPDATE SET
          short_text = excluded.short_text,
          full_text = excluded.full_text,
          registration_url = excluded.registration_url,
          promo_code = excluded.promo_code,
          registration_note = excluded.registration_note,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
      `)
      const insertPaymentMethod = this.db.prepare(`
        INSERT INTO room_payment_methods (
          room_key, deal_type, operation_type, method_name, currency, network,
          fee_text, limits_text, note, sort_order, is_active
        )
        VALUES (
          @roomKey, @dealType, @operationType, @methodName, @currency, @network,
          @feeText, @limitsText, @note, @sortOrder, @isActive
        )
        ON CONFLICT(room_key, deal_type, operation_type, method_name, currency, network) DO UPDATE SET
          fee_text = excluded.fee_text,
          limits_text = excluded.limits_text,
          note = excluded.note,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active
      `)
      const insertWallet = this.db.prepare(`
        INSERT INTO room_wallets (
          room_key, deal_type, currency, network, wallet_address, memo_tag,
          fee_text, note, verified_at, is_active, sort_order
        )
        VALUES (
          @roomKey, @dealType, @currency, @network, @walletAddress, @memoTag,
          @feeText, @note, @verifiedAt, @isActive, @sortOrder
        )
        ON CONFLICT(room_key, deal_type, currency, network, wallet_address) DO UPDATE SET
          memo_tag = excluded.memo_tag,
          fee_text = excluded.fee_text,
          note = excluded.note,
          verified_at = excluded.verified_at,
          is_active = excluded.is_active,
          sort_order = excluded.sort_order
      `)
      const insertCountry = this.db.prepare(`
        INSERT INTO room_country_availability (
          room_key, country_code, country_name, status, deal_type, language,
          note, source_date, sort_order, is_active
        )
        VALUES (
          @roomKey, @countryCode, @countryName, @status, @dealType, @language,
          @note, @sourceDate, @sortOrder, @isActive
        )
        ON CONFLICT(room_key, country_code, status, deal_type, language) DO UPDATE SET
          country_name = excluded.country_name,
          note = excluded.note,
          source_date = excluded.source_date,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active
      `)

      for (const profile of seed.profiles) {
        insertProfile.run({
          roomKey: profile.roomKey,
          displayName: profile.displayName,
          networkName: profile.networkName || null,
          isActive: profile.isActive === false ? 0 : 1,
          notes: profile.notes || null
        })
      }

      for (const deal of seed.deals) {
        insertDeal.run({
          roomKey: deal.roomKey,
          dealType: deal.dealType || 'General',
          language: deal.language,
          shortText: deal.shortText,
          fullText: deal.fullText,
          registrationUrl: deal.registrationUrl || null,
          promoCode: deal.promoCode || null,
          registrationNote: deal.registrationNote || null,
          sortOrder: deal.sortOrder || 0,
          isActive: deal.isActive === false ? 0 : 1,
          updatedAt: deal.updatedAt || null
        })
      }

      for (const method of seed.paymentMethods) {
        insertPaymentMethod.run({
          roomKey: method.roomKey,
          dealType: method.dealType || 'General',
          operationType: method.operationType,
          methodName: method.methodName,
          currency: method.currency || '',
          network: method.network || '',
          feeText: method.feeText || null,
          limitsText: method.limitsText || null,
          note: method.note || null,
          sortOrder: method.sortOrder || 0,
          isActive: method.isActive === false ? 0 : 1
        })
      }

      for (const wallet of seed.wallets) {
        insertWallet.run({
          roomKey: wallet.roomKey,
          dealType: wallet.dealType || 'General',
          currency: wallet.currency,
          network: wallet.network,
          walletAddress: wallet.walletAddress,
          memoTag: wallet.memoTag || null,
          feeText: wallet.feeText || null,
          note: wallet.note || null,
          verifiedAt: wallet.verifiedAt || null,
          isActive: wallet.isActive === false ? 0 : 1,
          sortOrder: wallet.sortOrder || 0
        })
      }

      for (const country of seed.countries) {
        insertCountry.run({
          roomKey: country.roomKey,
          countryCode: country.countryCode.trim().toUpperCase(),
          countryName: country.countryName,
          status: country.status,
          dealType: country.dealType || '',
          language: country.language || '',
          note: country.note || null,
          sourceDate: country.sourceDate || null,
          sortOrder: country.sortOrder || 0,
          isActive: country.isActive === false ? 0 : 1
        })
      }
    })

    seedRooms()
  }

  private migratePrimaryContacts() {
    const duplicatePrimaryContacts = this.db.prepare(`
      SELECT
        '' AS method_key,
        LOWER(messenger_username) AS value_key,
        GROUP_CONCAT(id) AS player_ids,
        COUNT(*) AS duplicate_count
      FROM players
      WHERE messenger_username IS NOT NULL AND messenger_username != ''
      GROUP BY value_key
      HAVING duplicate_count > 1
    `).all() as DuplicateContactRow[]

    if (duplicatePrimaryContacts.length > 0) {
      throw new Error(
        `Primary contact migration found duplicate players. Resolve these manually before continuing: ${JSON.stringify(duplicatePrimaryContacts)}`
      )
    }

    this.db.prepare(`
      INSERT INTO player_contacts (player_id, contact_method, contact_value, is_primary)
      SELECT p.id, p.contact_method, p.messenger_username, 1
      FROM players p
      WHERE p.messenger_username IS NOT NULL
        AND p.messenger_username != ''
        AND NOT EXISTS (
          SELECT 1
          FROM players duplicate
          WHERE duplicate.id != p.id
            AND duplicate.messenger_username IS NOT NULL
            AND duplicate.messenger_username != ''
            AND duplicate.messenger_username = p.messenger_username COLLATE NOCASE
        )
        AND NOT EXISTS (
          SELECT 1
          FROM player_contacts existing
          WHERE existing.contact_value = p.messenger_username COLLATE NOCASE
        )
    `).run()

    const duplicateMigratedContacts = this.db.prepare(`
      SELECT
        '' AS method_key,
        LOWER(contact_value) AS value_key,
        GROUP_CONCAT(player_id) AS player_ids,
        COUNT(*) AS duplicate_count
      FROM player_contacts
      GROUP BY value_key
      HAVING duplicate_count > 1
    `).all() as DuplicateContactRow[]

    if (duplicateMigratedContacts.length > 0) {
      throw new Error(
        `player_contacts contains duplicate contacts that block the case-insensitive unique index. Resolve these manually before continuing: ${JSON.stringify(duplicateMigratedContacts)}`
      )
    }
  }

  private normalizeContacts(data: SavePlayerInput): ContactInput[] {
    const rawContacts = Array.isArray(data.contacts) && data.contacts.length > 0
      ? data.contacts
      : [{ contactMethod: data.contact_method || 'TG', contactValue: data.messenger_username || '' }]

    const contacts = rawContacts
      .map((contact) => ({
        contactMethod: contact.contactMethod || contact.contact_method || 'TG',
        contactValue: normalizeContactText(String(contact.contactValue || contact.contact_value || '')),
        isPrimary: Boolean(contact.isPrimary || contact.is_primary)
      }))
      .filter((contact) => contact.contactValue)

    const primaryIndex = contacts.findIndex((contact) => contact.isPrimary)
    if (contacts.length > 0) {
      contacts.forEach((contact, index) => {
        contact.isPrimary = primaryIndex === -1 ? index === 0 : index === primaryIndex
      })
    }

    return contacts
  }

  private getPlayerPayload(player: DbPlayer) {
    const accounts = this.db.prepare('SELECT * FROM accounts WHERE player_id = ?').all(player.id)
    const contacts = this.db.prepare('SELECT * FROM player_contacts WHERE player_id = ? ORDER BY is_primary DESC, id ASC').all(player.id)
    return { player, accounts, contacts }
  }
}
