/**
 * autoportal data access — thin wrapper over a Cloudflare D1 (SQLite) binding.
 *
 * Isolation rule: this file NEVER touches MySQL/mysql2/TiDB. The only database
 * is the D1 binding `DB` declared in wrangler.jsonc. Bindings are read from the
 * OpenNext Cloudflare context, which works both in production (Workers) and in
 * local dev (via initOpenNextCloudflareForDev + Miniflare).
 *
 * D1 placeholders use `?` and values are passed positionally to .bind(...).
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

// ── Minimal structural types for the D1 binding (no @cloudflare/workers-types) ─
export interface D1Meta {
  changes?: number;
  last_row_id?: number;
  duration?: number;
  rows_read?: number;
  rows_written?: number;
}
interface D1ResultSet<T> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<D1ResultSet<T>>;
  first<T = unknown>(col?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1ResultSet<T>>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1ResultSet<T>[]>;
}

export interface ExecResult {
  changes: number;
  lastRowId: number;
}

async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as unknown as { DB: D1Database }).DB;
  if (!db) {
    throw new Error('D1 binding "DB" is not available. Check wrangler.jsonc / .dev.vars.');
  }
  return db;
}

/** Run a SELECT and return all rows. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDB();
  const { results } = await db.prepare(sql).bind(...params).all<T>();
  return results ?? [];
}

/** Run a query and return the first row (or null). */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const db = await getDB();
  return await db.prepare(sql).bind(...params).first<T>();
}

/** Run an INSERT/UPDATE/DELETE and report affected rows + last insert rowid. */
export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<ExecResult> {
  const db = await getDB();
  const res = await db.prepare(sql).bind(...params).run();
  return {
    changes: res.meta?.changes ?? 0,
    lastRowId: res.meta?.last_row_id ?? 0,
  };
}

export interface Statement {
  sql: string;
  params?: unknown[];
}

/**
 * Atomic multi-statement write. D1 batch runs all statements in a single
 * transaction (all commit or all roll back) — the correct primitive on Workers,
 * where there is no persistent connection to open a manual transaction on.
 */
export async function batch(statements: Statement[]): Promise<ExecResult[]> {
  const db = await getDB();
  const prepared = statements.map((s) => db.prepare(s.sql).bind(...(s.params ?? [])));
  const results = await db.batch(prepared as unknown as D1PreparedStatement[]);
  return results.map((r) => ({
    changes: r.meta?.changes ?? 0,
    lastRowId: r.meta?.last_row_id ?? 0,
  }));
}

/** Parse a JSON TEXT column defensively; returns `fallback` on any problem. */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
