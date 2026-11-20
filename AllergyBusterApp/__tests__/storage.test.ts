/**
 * Runs the real migrations and profile queries against Node's built-in SQLite,
 * wrapped in the same SqlDb interface op-sqlite provides in the app.
 */
import {MIGRATIONS, SCHEMA_VERSION, runMigrations} from '../src/storage/migrations';
import {setDbForTesting} from '../src/storage/db';
import {loadProfile, saveProfile} from '../src/storage/profileStore';
import {nodeDb} from '../test-utils/nodeSqlite';

jest.mock('@op-engineering/op-sqlite', () => ({open: jest.fn()}));

describe('migrations', () => {
  it('migrates an empty database to the latest version', async () => {
    const db = nodeDb();
    expect(await runMigrations(db)).toBe(SCHEMA_VERSION);
    const {rows} = await db.execute('PRAGMA user_version');
    expect(rows[0].user_version).toBe(MIGRATIONS.length);
  });

  it('is idempotent', async () => {
    const db = nodeDb();
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.toBe(SCHEMA_VERSION);
  });

  it('leaves a database from a newer build untouched', async () => {
    const db = nodeDb();
    db.raw.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 5}`);
    expect(await runMigrations(db)).toBe(SCHEMA_VERSION + 5);
    const {rows} = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profile'",
    );
    expect(rows).toHaveLength(0);
  });

  it('rolls back a failed migration and keeps the version', async () => {
    const db = nodeDb();
    const broken = [...MIGRATIONS, ['CREATE TABLE ok_table (id INTEGER)', 'NOT VALID SQL']];
    await expect(runMigrations(db, broken)).rejects.toThrow();
    const {rows} = await db.execute('PRAGMA user_version');
    expect(rows[0].user_version).toBe(SCHEMA_VERSION);
    const tables = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ok_table'",
    );
    expect(tables.rows).toHaveLength(0);
  });
});

describe('profileStore', () => {
  let db: ReturnType<typeof nodeDb>;

  beforeEach(async () => {
    db = nodeDb();
    await runMigrations(db);
    setDbForTesting(db);
  });

  afterAll(() => setDbForTesting(null));

  it('returns an empty profile before anything is saved', async () => {
    expect(await loadProfile()).toEqual({allergens: [], updatedAt: null});
  });

  it('round-trips the allergen list', async () => {
    await saveProfile({allergens: ['Milk', 'Peanuts'], updatedAt: '2026-11-15T10:00:00.000Z'});
    const p = await loadProfile();
    expect(p.allergens.sort()).toEqual(['Milk', 'Peanuts']);
    expect(p.updatedAt).toBe('2026-11-15T10:00:00.000Z');
  });

  it('replaces the previous selection on save', async () => {
    await saveProfile({allergens: ['Milk', 'Peanuts'], updatedAt: '2026-11-15T10:00:00.000Z'});
    await saveProfile({allergens: ['Sesame'], updatedAt: '2026-11-15T11:00:00.000Z'});
    const p = await loadProfile();
    expect(p.allergens).toEqual(['Sesame']);
    expect(p.updatedAt).toBe('2026-11-15T11:00:00.000Z');
  });

  it('supports clearing all allergens', async () => {
    await saveProfile({allergens: ['Milk'], updatedAt: '2026-11-15T10:00:00.000Z'});
    await saveProfile({allergens: [], updatedAt: '2026-11-15T11:00:00.000Z'});
    expect((await loadProfile()).allergens).toEqual([]);
  });

  it('ignores unknown allergen keys left by a future build', async () => {
    await saveProfile({allergens: ['Milk'], updatedAt: '2026-11-15T10:00:00.000Z'});
    await db.execute(
      "INSERT INTO profile_allergen (profile_id, allergen_key) VALUES ('primary', 'Kiwi')",
    );
    expect((await loadProfile()).allergens).toEqual(['Milk']);
  });
});
