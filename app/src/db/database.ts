/**
 * Thin, typed wrapper around SQLite (sql.js / WASM).
 *
 * Environment-agnostic on purpose: the same wrapper is used in the browser (persisted to IndexedDB,
 * see `browser.ts`) and in Node (in-memory, used by the tests and by the export/import tooling).
 */

import type { Database, SqlJsStatic } from 'sql.js';
import { runMigrations } from './migrations';

export type SqlValue = string | number | null | Uint8Array;

export interface DbClientOptions {
  /** Called after every successful write so callers can schedule a durable flush. */
  onChange?: () => void;
  logs?: string[];
}

export class DbClient {
  readonly db: Database;
  private readonly onChange?: () => void;
  private transactionDepth = 0;

  constructor(db: Database, options: DbClientOptions = {}) {
    this.db = db;
    this.onChange = options.onChange;
    runMigrations(db, options.logs);
  }

  /** Executes one or more statements, ignoring results. */
  exec(sql: string): void {
    this.db.exec(sql);
    this.notify();
  }

  /** Rows as plain objects keyed by column name. */
  all<T = Record<string, unknown>>(sql: string, params: SqlValue[] = []): T[] {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  }

  get<T = Record<string, unknown>>(sql: string, params: SqlValue[] = []): T | null {
    const rows = this.all<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  run(sql: string, params: SqlValue[] = []): void {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params);
      statement.step();
    } finally {
      statement.free();
    }
    this.notify();
  }

  /** Generic INSERT with named columns. Values must already be SQL-ready (JSON serialised). */
  insert(table: string, row: Record<string, SqlValue>): void {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    this.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      columns.map((c) => row[c] ?? null),
    );
  }

  upsert(table: string, row: Record<string, SqlValue>, conflictKey = 'id'): void {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const updates = columns
      .filter((c) => c !== conflictKey)
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');
    this.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(${conflictKey}) DO UPDATE SET ${updates}`,
      columns.map((c) => row[c] ?? null),
    );
  }

  update(table: string, id: string, patch: Record<string, SqlValue>): void {
    const columns = Object.keys(patch);
    if (columns.length === 0) return;
    const assignments = columns.map((c) => `${c} = ?`).join(', ');
    this.run(
      `UPDATE ${table} SET ${assignments} WHERE id = ?`,
      [...columns.map((c) => patch[c] ?? null), id],
    );
  }

  delete(table: string, id: string): void {
    this.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  count(table: string): number {
    const row = this.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
    return row ? Number(row.n) : 0;
  }

  /** Wraps a group of writes in a transaction; nested calls join the outer transaction. */
  transaction<T>(fn: () => T): T {
    if (this.transactionDepth > 0) return fn();
    this.transactionDepth += 1;
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      this.notify();
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    } finally {
      this.transactionDepth -= 1;
    }
  }

  exportBytes(): Uint8Array {
    return this.db.export();
  }

  close(): void {
    this.db.close();
  }

  private notify(): void {
    this.onChange?.();
  }
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

/** Loads the sql.js runtime once per process/browser session. */
export async function loadSqlJs(locateFile?: (file: string) => string): Promise<SqlJsStatic> {
  if (locateFile) {
    const { default: initSqlJs } = await import('sql.js');
    return initSqlJs({ locateFile });
  }
  if (!sqlJsPromise) {
    const { default: initSqlJs } = await import('sql.js');
    sqlJsPromise = initSqlJs();
  }
  return sqlJsPromise;
}

/** In-memory database (tests, tooling, import/export validation). */
export async function openMemoryDatabase(options: DbClientOptions = {}): Promise<DbClient> {
  const SQL = await loadSqlJs();
  return new DbClient(new SQL.Database(), options);
}

/** Opens a database from raw bytes (backup restore). */
export async function openDatabaseFromBytes(
  bytes: Uint8Array,
  options: DbClientOptions = {},
): Promise<DbClient> {
  const SQL = await loadSqlJs();
  return new DbClient(new SQL.Database(bytes), options);
}
