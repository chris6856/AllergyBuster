import {SqlDb} from './sqlTypes';

/**
 * Schema migrations, applied in order and tracked with PRAGMA user_version.
 *
 * Rules:
 *  - Never edit a migration that has shipped; add a new one.
 *  - One SQL statement per array entry (native op-sqlite runs only the first
 *    statement of each execute call).
 *  - Phase 1 tables (products, snapshots, approvals, shopping lists, retailer
 *    data; see AllergyBuster-2.0-plan.md §2.1) are added as later migrations
 *    when those features are built.
 */
export const MIGRATIONS: string[][] = [
  // 1: allergy profiles. Multi-profile from the start so the Plus family plan
  // needs no data migration; 1.2 uses only the 'primary' profile.
  [
    `CREATE TABLE profile (
       id          TEXT PRIMARY KEY,
       name        TEXT NOT NULL,
       is_primary  INTEGER NOT NULL DEFAULT 0,
       created_at  TEXT NOT NULL,
       updated_at  TEXT
     )`,
    `CREATE TABLE profile_allergen (
       profile_id    TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
       allergen_key  TEXT NOT NULL,
       PRIMARY KEY (profile_id, allergen_key)
     )`,
  ],
];

export const SCHEMA_VERSION = MIGRATIONS.length;

async function getUserVersion(db: SqlDb): Promise<number> {
  const {rows} = await db.execute('PRAGMA user_version');
  return Number(rows[0]?.user_version ?? 0);
}

/** Applies pending migrations. Each migration runs in its own transaction. */
export async function runMigrations(
  db: SqlDb,
  migrations: string[][] = MIGRATIONS,
): Promise<number> {
  await db.execute('PRAGMA foreign_keys = ON');
  const target = migrations.length;
  const current = await getUserVersion(db);
  if (current > target) {
    // A newer app build wrote this DB (e.g. TestFlight downgrade). Don't touch it.
    return current;
  }
  for (let v = current; v < target; v++) {
    const statements = migrations[v];
    await db.transaction(async tx => {
      for (const sql of statements) {
        await tx.execute(sql);
      }
      // PRAGMA can't take bound parameters; v is an internal integer.
      await tx.execute(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return target;
}
