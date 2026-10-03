import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { getPendingMigrations, getSchemaVersion, runMigrations, type MigrationStep } from './migrations'

let db: Database.Database

beforeEach(() => {
  db = new Database(':memory:')
  db.exec('CREATE TABLE items (name TEXT NOT NULL UNIQUE)')
})

afterEach(() => {
  db.close()
})

const insertStep = (version: number, name: string): MigrationStep => ({
  version,
  name,
  up: () => {
    db.prepare('INSERT INTO items (name) VALUES (?)').run(name)
  },
})

const itemNames = () => (db.prepare('SELECT name FROM items ORDER BY rowid').all() as Array<{ name: string }>)
  .map((row) => row.name)

describe('runMigrations', () => {
  it('applies pending steps once, in version order', () => {
    const steps = [insertStep(2, 'second'), insertStep(1, 'first')]

    runMigrations(db, steps)
    runMigrations(db, steps)

    expect(itemNames()).toEqual(['first', 'second'])
    expect(getSchemaVersion(db)).toBe(2)
    expect(getPendingMigrations(db, steps)).toHaveLength(0)
  })

  it('rolls back a failed step together with its version and stops', () => {
    const failing: MigrationStep = {
      version: 2,
      name: 'failing',
      up: () => {
        db.prepare('INSERT INTO items (name) VALUES (?)').run('partial')
        throw new Error('boom')
      },
    }

    expect(() => runMigrations(db, [insertStep(1, 'first'), failing, insertStep(3, 'third')]))
      .toThrow('Database migration 2 (failing) failed: boom')

    expect(itemNames()).toEqual(['first'])
    expect(getSchemaVersion(db)).toBe(1)
  })
})
