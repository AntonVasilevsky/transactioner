import Database from 'better-sqlite3'
import { contactSearchKey, normalizeContactText } from '../src/utils/contactNormalization'

export type ContactMethod = 'TG' | 'WA' | 'Discord' | 'Teams' | 'Email'

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
          const key = `${contact.contactMethod.toLowerCase()}::${contactValueKey}`
          if (seenContacts.has(key)) {
            throw new Error(`Контакт ${contact.contactMethod}: ${contact.contactValue} указан несколько раз`)
          }
          seenContacts.add(key)

          const existingContact = (this.db.prepare(`
            SELECT * FROM player_contacts
            WHERE contact_method = ? COLLATE NOCASE
          `).all(contact.contactMethod) as DbContact[])
            .find(existing => contactSearchKey(existing.contact_value) === contactValueKey)

          if (existingContact && (!playerId || existingContact.player_id !== playerId)) {
            throw new Error(`Контакт ${contact.contactMethod}: ${contact.contactValue} уже привязан к другому игроку`)
          }
        }

        const usernameKey = contactSearchKey(username)
        const existingPrimary = (this.db.prepare(`
          SELECT * FROM players
          WHERE contact_method = ? COLLATE NOCASE
        `).all(contactMethod) as DbPlayer[])
          .find(existing => contactSearchKey(existing.messenger_username) === usernameKey)

        if (existingPrimary && (!playerId || existingPrimary.id !== playerId)) {
          throw new Error(`Игрок ${contactMethod}: ${username} уже существует`)
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
    `)
  }

  private migratePrimaryContacts() {
    const duplicatePrimaryContacts = this.db.prepare(`
      SELECT
        LOWER(contact_method) AS method_key,
        LOWER(messenger_username) AS value_key,
        GROUP_CONCAT(id) AS player_ids,
        COUNT(*) AS duplicate_count
      FROM players
      WHERE messenger_username IS NOT NULL AND messenger_username != ''
      GROUP BY method_key, value_key
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
            AND duplicate.contact_method = p.contact_method COLLATE NOCASE
            AND duplicate.messenger_username = p.messenger_username COLLATE NOCASE
        )
        AND NOT EXISTS (
          SELECT 1
          FROM player_contacts existing
          WHERE existing.contact_method = p.contact_method COLLATE NOCASE
            AND existing.contact_value = p.messenger_username COLLATE NOCASE
        )
    `).run()

    const duplicateMigratedContacts = this.db.prepare(`
      SELECT
        LOWER(contact_method) AS method_key,
        LOWER(contact_value) AS value_key,
        GROUP_CONCAT(player_id) AS player_ids,
        COUNT(*) AS duplicate_count
      FROM player_contacts
      GROUP BY method_key, value_key
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
