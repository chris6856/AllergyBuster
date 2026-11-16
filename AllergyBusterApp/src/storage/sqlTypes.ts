// Minimal SQL surface the app depends on. op-sqlite's DB satisfies it at
// runtime; tests satisfy it with Node's built-in sqlite (see __tests__).
export type SqlValue = string | number | null;
export type SqlRow = Record<string, unknown>;

export interface SqlResult {
  rows: SqlRow[];
}

export interface SqlExecutor {
  execute: (sql: string, params?: SqlValue[]) => Promise<SqlResult>;
}

export interface SqlDb extends SqlExecutor {
  transaction: (fn: (tx: SqlExecutor) => Promise<void>) => Promise<void>;
}
