/**
 * Node's built-in SQLite wrapped in the app's SqlDb interface, so tests run
 * the real schema and queries that op-sqlite runs on device.
 */
import {SqlDb, SqlExecutor} from '../src/storage/sqlTypes';

const {DatabaseSync} = require('node:sqlite');

export type NodeDb = SqlDb & {raw: any};

export function nodeDb(): NodeDb {
  const raw = new DatabaseSync(':memory:');
  const exec: SqlExecutor['execute'] = async (sql, params = []) => {
    const stmt = raw.prepare(sql);
    const isQuery = /^\s*(select|pragma\s+\w+\s*$)/i.test(sql);
    if (isQuery) {
      return {rows: stmt.all(...params)};
    }
    stmt.run(...params);
    return {rows: []};
  };
  return {
    raw,
    execute: exec,
    transaction: async fn => {
      raw.exec('BEGIN');
      try {
        await fn({execute: exec});
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
