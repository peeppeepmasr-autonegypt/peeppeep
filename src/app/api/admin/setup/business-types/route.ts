/**
 * /api/admin/setup/business-types
 * GET  — list all business types (parent chain intact)
 * POST — create/replace a business type
 * PATCH — partial update (id in body)
 *
 * A kind is the unit of settling: its shelves, its parent, what it may contain and
 * whether a vendor may claim it have to agree in ONE write. `assertKindDefinition`
 * runs before the row moves, because a kind created half-valid is a page shape
 * nobody can complete later without editing the database by hand.
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query, queryOne, execute } from '@/lib/db';
import { TypologyError, assertKindDefinition, type KindDefinitionInput } from '@/lib/typology';

const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

/** A refusal is a sentence about the model, so it answers 409 rather than 500. */
function refuse(e: unknown): Response {
  if (e instanceof TypologyError) return err(e.message, 409);
  throw e;
}

interface KindRow {
  id: string; name: string; name_ar: string | null; icon: string | null; description: string | null;
  is_parent: number; parent_id: string | null; market_id: string; vendor_claimable: number;
  sort_order: number; sections: string | null; own_sections: string | null; allowed_child_kinds: string | null;
}

const KIND_SELECT = `id, name, name_ar, icon, description, is_parent, parent_id, market_id,
                     vendor_claimable, sort_order, sections, own_sections, allowed_child_kinds`;

/** The columns a caller may write. Everything else in the body is ignored. */
const COLUMNS = ['name', 'name_ar', 'icon', 'description', 'is_parent', 'parent_id', 'market_id',
  'vendor_claimable', 'sort_order', 'sections', 'own_sections', 'allowed_child_kinds'] as const;

async function auth(req: Request) {
  const hdrs = await headers();
  const fake = new Request(req.url, { headers: Object.fromEntries(hdrs.entries()) });
  const user = await getAdminUser(fake);
  return user?.role === 'platform_admin' ? user : null;
}

export async function GET(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const rows = await query(`SELECT ${KIND_SELECT} FROM business_types ORDER BY sort_order, id`);
  return ok({ types: rows });
}

export async function POST(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const b = await req.json() as Partial<KindRow>;
  const { id, name } = b;
  if (!id || !name) return err('id and name are required');

  // INSERT OR REPLACE writes a whole row, so anything the form omits is reset.
  // `allowed_child_kinds` is the column that must survive: wiping it would
  // silently forbid every child the kind was allowed to hold.
  const existing = await queryOne<{ allowed_child_kinds: string | null }>(
    'SELECT allowed_child_kinds FROM business_types WHERE id = ?', [id],
  );
  const childKinds = b.allowed_child_kinds ?? existing?.allowed_child_kinds ?? '[]';

  const definition: KindDefinitionInput = {
    id, name,
    is_parent: b.is_parent ?? 0,
    parent_id: b.parent_id ?? null,
    market_id: b.market_id ?? 'automotive',
    vendor_claimable: b.vendor_claimable ?? 0,
    sections: b.sections ?? '[]',
    own_sections: b.own_sections ?? '[]',
    allowed_child_kinds: childKinds,
  };
  try {
    await assertKindDefinition(definition);
  } catch (e) {
    return refuse(e);
  }

  await execute(
    `INSERT OR REPLACE INTO business_types
       (id, name, name_ar, icon, description, is_parent, parent_id, market_id,
        vendor_claimable, sort_order, sections, own_sections, allowed_child_kinds)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, b.name_ar ?? null, b.icon ?? null, b.description ?? null,
     definition.is_parent ? 1 : 0, definition.parent_id ?? null, definition.market_id,
     definition.vendor_claimable ? 1 : 0, b.sort_order ?? 99,
     String(definition.sections), String(definition.own_sections), childKinds],
  );
  return ok({ ok: true }, 201);
}

export async function PATCH(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const b = await req.json() as Record<string, unknown>;
  const { id, ...rest } = b;
  if (!id || typeof id !== 'string') return err('id required');

  const current = await queryOne<KindRow>(`SELECT ${KIND_SELECT} FROM business_types WHERE id = ?`, [id]);
  if (!current) return err(`business type "${id}" does not exist`, 404);

  const picked: Record<string, unknown> = {};
  for (const k of COLUMNS) if (k in rest) picked[k] = rest[k];
  if (!Object.keys(picked).length) return err('nothing to update');

  // Validated as the WHOLE prospective row: a patch that changes only
  // `vendor_claimable` still has to agree with the kind's own `is_parent`.
  const next = { ...current, ...picked };
  try {
    await assertKindDefinition(next);
  } catch (e) {
    return refuse(e);
  }

  const sets = Object.keys(picked).map((k) => `${k} = ?`);
  const vals: unknown[] = Object.values(picked);
  vals.push(id);
  await execute(`UPDATE business_types SET ${sets.join(', ')} WHERE id = ?`, vals);
  return ok({ ok: true });
}
