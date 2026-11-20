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

  // 2: saved products, ingredient snapshots, approvals, shopping lists,
  // preferences (2.0 plan §2.1). A product's approval points at the snapshot
  // it was made against; a newer snapshot with a different content_hash
  // means "Recheck needed". Approval never changes automatically.
  [
    `CREATE TABLE product (
       gtin        TEXT PRIMARY KEY,
       name        TEXT NOT NULL,
       brand       TEXT NOT NULL DEFAULT '',
       image_url   TEXT,
       category    TEXT NOT NULL,
       source      TEXT NOT NULL,
       created_at  TEXT NOT NULL,
       updated_at  TEXT NOT NULL
     )`,
    `CREATE TABLE product_snapshot (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       gtin          TEXT NOT NULL REFERENCES product(gtin) ON DELETE CASCADE,
       content_hash  TEXT NOT NULL,
       record_json   TEXT NOT NULL,
       origin        TEXT NOT NULL CHECK (origin IN ('lookup', 'photo')),
       captured_at   TEXT NOT NULL
     )`,
    'CREATE INDEX idx_snapshot_gtin ON product_snapshot (gtin, id)',
    `CREATE TABLE product_approval (
       gtin         TEXT PRIMARY KEY REFERENCES product(gtin) ON DELETE CASCADE,
       status       TEXT NOT NULL CHECK (status IN ('approved', 'needs_review', 'avoid')),
       snapshot_id  INTEGER REFERENCES product_snapshot(id),
       note         TEXT NOT NULL DEFAULT '',
       decided_at   TEXT NOT NULL
     )`,
    `CREATE TABLE shopping_list (
       id          TEXT PRIMARY KEY,
       name        TEXT NOT NULL,
       sort_order  INTEGER NOT NULL DEFAULT 0,
       created_at  TEXT NOT NULL,
       updated_at  TEXT NOT NULL
     )`,
    `CREATE TABLE shopping_list_item (
       id          TEXT PRIMARY KEY,
       list_id     TEXT NOT NULL REFERENCES shopping_list(id) ON DELETE CASCADE,
       gtin        TEXT REFERENCES product(gtin) ON DELETE SET NULL,
       label       TEXT NOT NULL,
       quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
       checked     INTEGER NOT NULL DEFAULT 0,
       sort_order  INTEGER NOT NULL DEFAULT 0,
       added_at    TEXT NOT NULL
     )`,
    'CREATE INDEX idx_item_list ON shopping_list_item (list_id, checked, sort_order)',
    `CREATE TABLE user_preference (
       key         TEXT PRIMARY KEY,
       value_json  TEXT NOT NULL,
       updated_at  TEXT NOT NULL
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
