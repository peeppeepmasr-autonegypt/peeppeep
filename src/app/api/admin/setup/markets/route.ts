/**
 * /api/admin/setup/markets
 * GET  — list all markets
 * POST — create a market
 * PATCH — update a market (id in body)
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query, execute } from '@/lib/db';
import { TypologyError, assertMarketDefinition } from '@/lib/typology';

const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

function refuse(e: unknown): Response {
  if (e instanceof TypologyError) return err(e.message, 409);
  throw e;
}

/** Columns a caller may write, so a stray key cannot become SQL. */
const COLUMNS = ['name_en', 'name_ar', 'default_locale', 'currency', 'active'] as const;

async function auth(req: Request) {
  const hdrs = await headers();
  const fake = new Request(req.url, { headers: Object.fromEntries(hdrs.entries()) });
  const user = await getAdminUser(fake);
  return user?.role === 'platform_admin' ? user : null;
}

export async function GET(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const rows = await query(`SELECT id, slug, name_en, name_ar, default_locale, currency, active FROM markets ORDER BY id`);
  return ok({ markets: rows });
}

export async function POST(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const b = await req.json() as { id?: string; slug?: string; name_en?: string; name_ar?: string; default_locale?: string; currency?: string; active?: number };
  const { id, slug, name_en, name_ar, default_locale = 'ar', currency = 'EGP', active = 1 } = b;
  if (!id || !name_en) return err('id and name_en are required');
  try {
    assertMarketDefinition({ id, slug, currency, default_locale });
  } catch (e) {
    return refuse(e);
  }
  await execute(
    `INSERT OR REPLACE INTO markets (id, slug, name_en, name_ar, default_locale, currency, active) VALUES (?,?,?,?,?,?,?)`,
    [id, slug ?? id, name_en, name_ar ?? null, default_locale, currency, active ? 1 : 0],
  );
  return ok({ ok: true }, 201);
}

export async function PATCH(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const b = await req.json() as { id: string; active?: number; name_en?: string; name_ar?: string; currency?: string; default_locale?: string };
  const { id, ...rest } = b;
  if (!id) return err('id required');
  const picked: Record<string, unknown> = {};
  for (const k of COLUMNS) if (k in rest) picked[k] = rest[k];
  if (!Object.keys(picked).length) return err('nothing to update');
  try {
    assertMarketDefinition({
      id,
      currency: picked.currency == null ? null : String(picked.currency),
      default_locale: picked.default_locale == null ? null : String(picked.default_locale),
    });
  } catch (e) {
    return refuse(e);
  }
  const sets = Object.keys(picked).map((k) => `${k} = ?`);
  const vals: unknown[] = Object.values(picked);
  vals.push(id);
  await execute(`UPDATE markets SET ${sets.join(', ')} WHERE id = ?`, vals);
  return ok({ ok: true });
}
