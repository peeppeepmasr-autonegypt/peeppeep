/**
 * /api/admin/setup/sections
 * GET  — list all sections
 * POST — create/replace a section
 * PATCH — partial update (id in body)
 *
 * A shelf is either a form, a query, or both — and since migration 0010 the
 * database says which. These endpoints are where that claim is checked, because a
 * shelf declared relational while still holding definitions does not fail: the
 * typed answers are stored, the query wins, and the author keeps editing a field
 * that prints nowhere.
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query, queryOne, execute } from '@/lib/db';
import {
  TypologyError,
  assertShelfDemoteable,
  assertShelfShape,
  loadShelf,
  type ContentKind,
  type ShelfRow,
} from '@/lib/typology';

const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

function refuse(e: unknown): Response {
  if (e instanceof TypologyError) return err(e.message, 409);
  throw e;
}

const SHELF_SELECT = `id, name, name_ar, icon, description, sort_order,
                      enable_gallery, enable_blog, options, content_kind`;

/** The columns a caller may write. Everything else in the body is ignored. */
const COLUMNS = ['name', 'name_ar', 'icon', 'description', 'sort_order',
  'enable_gallery', 'enable_blog', 'options', 'content_kind'] as const;

interface ShelfInput {
  id: string; name: string; name_ar?: string | null; icon?: string | null;
  description?: string | null; sort_order?: number; enable_gallery?: number;
  enable_blog?: number; options?: string | null; content_kind?: string;
}

async function auth(req: Request) {
  const hdrs = await headers();
  const fake = new Request(req.url, { headers: Object.fromEntries(hdrs.entries()) });
  const user = await getAdminUser(fake);
  return user?.role === 'platform_admin' ? user : null;
}

export async function GET(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const rows = await query(`SELECT ${SHELF_SELECT} FROM sections ORDER BY sort_order, id`);
  return ok({ sections: rows });
}

/**
 * Checks the prospective row, not the delta: `content_kind` and `options` only
 * mean something together, and a PATCH that sends one of them still has to agree
 * with the other as it already stands.
 */
async function checkShelf(prospective: { id: string; name: string; options: string | null; content_kind: string }) {
  assertShelfShape(prospective);
  await assertShelfDemoteable(prospective.id, prospective.content_kind as ContentKind);
}

export async function POST(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const b = await req.json() as Partial<ShelfInput> & { id?: string; name?: string };
  const { id, name } = b;
  if (!id || !name) return err('id and name are required');

  // INSERT OR REPLACE writes the whole row. A form that has no content_kind field
  // must not silently demote a relational shelf back to 'authored' — that alone
  // would re-open every shelf 0010 just classified.
  const existing = await loadShelf(id);
  const contentKind = b.content_kind ?? existing?.content_kind ?? 'authored';
  const options = b.options ?? existing?.options ?? '{}';

  try {
    await checkShelf({ id, name, options, content_kind: contentKind });
  } catch (e) {
    return refuse(e);
  }

  await execute(
    `INSERT OR REPLACE INTO sections
       (id, name, name_ar, icon, description, sort_order, enable_gallery, enable_blog, options, content_kind)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, name, b.name_ar ?? null, b.icon ?? null, b.description ?? null,
     b.sort_order ?? 99, b.enable_gallery ? 1 : 0, b.enable_blog ? 1 : 0, options, contentKind],
  );
  return ok({ ok: true }, 201);
}

export async function PATCH(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const b = await req.json() as Record<string, unknown>;
  const { id, ...rest } = b;
  if (!id || typeof id !== 'string') return err('id required');

  const current = await queryOne<ShelfRow & { name: string }>(
    `SELECT ${SHELF_SELECT} FROM sections WHERE id = ?`, [id],
  );
  if (!current) return err(`section "${id}" does not exist`, 404);

  const picked: Record<string, unknown> = {};
  for (const k of COLUMNS) if (k in rest) picked[k] = rest[k];
  if (!Object.keys(picked).length) return err('nothing to update');

  const next = { ...current, ...picked };
  try {
    await checkShelf({
      id, name: String(next.name),
      options: next.options == null ? null : String(next.options),
      content_kind: String(next.content_kind),
    });
  } catch (e) {
    return refuse(e);
  }

  const sets = Object.keys(picked).map((k) => `${k} = ?`);
  const vals: unknown[] = Object.values(picked);
  vals.push(id);
  await execute(`UPDATE sections SET ${sets.join(', ')} WHERE id = ?`, vals);
  return ok({ ok: true });
}
