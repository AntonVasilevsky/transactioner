import type Database from 'better-sqlite3'

export interface MigrationStep {
  version: number
  name: string
  up: () => void
}

export interface PendingMigrationInfo {
  fromVersion: number
  toVersion: number
  steps: string[]
}

export const getSchemaVersion = (db: Database.Database) => Number(db.pragma('user_version', { simple: true }) || 0)

export const getPendingMigrations = (db: Database.Database, steps: MigrationStep[]) => {
  const currentVersion = getSchemaVersion(db)
  return [...steps]
    .sort((left, right) => left.version - right.version)
    .filter((step) => step.version > currentVersion)
}

/**
 * Applies each pending step once, in its own transaction together with the
 * user_version bump, so a failed step leaves neither its changes nor the new version.
 */
export const runMigrations = (db: Database.Database, steps: MigrationStep[]) => {
  for (const step of getPendingMigrations(db, steps)) {
    const apply = db.transaction(() => {
      step.up()
      db.pragma(`user_version = ${Math.trunc(step.version)}`)
    })
    try {
      apply()
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err)
      throw new Error(`Database migration ${step.version} (${step.name}) failed: ${reason}`, { cause: err })
    }
  }
}
