import {open} from '@op-engineering/op-sqlite';
import {runMigrations} from './migrations';
import {SqlDb} from './sqlTypes';

const DB_NAME = 'allergybuster.sqlite';

let dbPromise: Promise<SqlDb> | null = null;

async function openAndMigrate(): Promise<SqlDb> {
  const db = open({name: DB_NAME}) as unknown as SqlDb;
  await runMigrations(db);
  return db;
}

/** Opens the app database once and applies migrations before first use. */
export function getDb(): Promise<SqlDb> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch(err => {
      dbPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return dbPromise;
}

/** Test hook: use an already-migrated database instead of op-sqlite. */
export function setDbForTesting(db: SqlDb | null): void {
  dbPromise = db ? Promise.resolve(db) : null;
}
