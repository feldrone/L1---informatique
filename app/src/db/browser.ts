/**
 * Browser persistence for the local-first SQLite database.
 *
 * - SQLite compiled to WebAssembly (`sql.js`) is the single source of truth.
 * - The database file is flushed to IndexedDB after writes (debounced) and on page hide/unload,
 *   so completed sessions survive a refresh even without any network.
 * - A rolling backup of the previous flush is kept (one slot) to protect against a corrupted write.
 */

import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { loadSqlJs, DbClient } from './database';

const DB_KEY = 'l1si.study.db.v1';
const BACKUP_KEY = 'l1si.study.db.backup.v1';
const META_STORE = 'kv';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('l1si-study-performance', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const request = tx.objectStore(META_STORE).get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface BrowserDatabaseHandle extends DbClient {
  flush(): Promise<void>;
  /** Number of durable writes performed (used by the UI to display sync status). */
  readonly flushCount: () => number;
}

/**
 * Single handle per page load.
 *
 * React StrictMode invokes mount effects twice in development; opening two handles on the same
 * IndexedDB record would let the first (stale) handle flush its bytes over the newer data. The
 * promise is therefore cached, so every caller shares one database connection.
 */
let sharedHandle: Promise<BrowserDatabaseHandle> | null = null;

export function openBrowserDatabase(): Promise<BrowserDatabaseHandle> {
  if (sharedHandle === null) sharedHandle = createBrowserDatabase();
  return sharedHandle;
}

/** Only used by tests/tools that need a fresh handle. */
export function resetSharedBrowserDatabase(): void {
  sharedHandle = null;
}

async function createBrowserDatabase(): Promise<BrowserDatabaseHandle> {
  const SQL = await loadSqlJs((file) => (file.endsWith('.wasm') ? wasmUrl : file));

  let existing: Uint8Array | null = null;
  try {
    const stored = await idbGet<Uint8Array | ArrayBuffer>(DB_KEY);
    if (stored) existing = stored instanceof Uint8Array ? stored : new Uint8Array(stored);
  } catch {
    // IndexedDB unavailable (private mode) → run in memory for this session.
    existing = null;
  }

  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;
  let flushCount = 0;
  let client: BrowserDatabaseHandle;
  // Writes are strictly serialised: two overlapping IndexedDB writes could persist an older
  // snapshot after a newer one (stale-handle overwrite, verified in the browser QA pass).
  let writeChain: Promise<void> = Promise.resolve();

  const writeSnapshot = async (): Promise<void> => {
    if (!pending) return;
    pending = false;
    try {
      const bytes = client.exportBytes();
      const previous = await idbGet<Uint8Array | ArrayBuffer>(DB_KEY);
      if (previous) await idbSet(BACKUP_KEY, previous);
      await idbSet(DB_KEY, bytes);
      flushCount += 1;
    } catch {
      // Persisting failed (quota/private mode). The in-memory database stays authoritative
      // for this session and the user can still export a JSON/SQLite backup from Settings.
    }
  };

  /**
   * Persists immediately (history-append operations call this) and waits for any in-flight write,
   * so a reload right after completing a task can never lose it.
   */
  const flushNow = (): Promise<void> => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    writeChain = writeChain.then(writeSnapshot, writeSnapshot);
    return writeChain;
  };

  const schedule = (): void => {
    pending = true;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      writeChain = writeChain.then(writeSnapshot, writeSnapshot);
    }, 120);
  };

  const db = existing ? new SQL.Database(existing) : new SQL.Database();
  client = new DbClient(db, { onChange: schedule }) as BrowserDatabaseHandle;

  Object.defineProperty(client, 'flush', { value: flushNow });
  Object.defineProperty(client, 'flushCount', { value: () => flushCount });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushNow();
    });
    window.addEventListener('pagehide', () => {
      void flushNow();
    });
  }
  return client;
}

/** Wipes persisted data (used by "reset local data" in Settings after an explicit confirmation). */
export async function clearPersistedDatabase(): Promise<void> {
  try {
    await idbSet(DB_KEY, null);
    await idbSet(BACKUP_KEY, null);
  } catch {
    /* ignore */
  }
}
