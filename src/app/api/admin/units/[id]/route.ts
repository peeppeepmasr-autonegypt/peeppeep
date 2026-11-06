/**
 * /api/admin/units/[id] — vendor unit lifecycle.
 *
 * GET    → return one unit by id, with its price history
 * PATCH  → update unit columns or overrides (guarded by assertUnitOverrideKey)
 * DELETE → soft-delete: set status='inactive', published=0
 *
 * Every handler checks the admin has access to the unit's seller before
 * proceeding. A TypologyError refusal returns 409 with the guard's sentence.
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { queryOne, execute } from '@/lib/db';
import { TypologyError, assertUnitOverrideKey } from '@/lib/typology';
import { priceHistory } from '@/lib/units';

interface RawUnitRow {
  id: string; slug: string; title: string; title_ar: string | null;
  unit_kind: string; status: string; stock_source: string;
  year: number | null; mileage_km: number | null; vin: string | null;
  color: string | null; color_ar: string | null;
  price_egp: number | null; price_currency: string; negotiable: number;
  seller_business_id: string; owner_business_id: string | null;
  model_business_id: string | null; trim_business_id: string | null;
  overrides: string | null; published: number; created_at: string; updated_at: string;
}

const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

async function auth() {
  const hdrs = await headers();
  const fake = new Request('http://localhost', { headers: Object.fromEntries(hdrs.entries()) });
  return getAdminUser(fake);
}

function refuse(e: unknown): Response {
  if (e instanceof TypologyError) return err(e.message, 409);
  throw e;
}

async function loadAndCheck(id: string, user: Awaited<ReturnType<typeof auth>>) {
  const unit = await queryOne<RawUnitRow>(
    'SELECT * FROM units WHERE id = ?', [id],
  );
  if (!unit) return { error: err('unit not found', 404) } as const;
  if (user && !user.scope_ids.includes('*') && !canAccessBusiness(user, unit.seller_business_id)) {
    return { error: err('forbidden', 403) } as const;
  }
  return { unit } as const;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth();
  if (!user) return err('unauthorized', 401);
  const { id } = await params;

  const result = await loadAndCheck(id, user);
  if ('error' in result) return result.error;

  const history = await priceHistory('unit', id);
  return ok({ unit: result.unit, history });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth();
  if (!user) return err('unauthorized', 401);
  const { id } = await params;

  const result = await loadAndCheck(id, user);
  if ('error' in result) return result.error;
  const unit = result.unit;

  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; }
  catch { return err('body must be valid JSON'); }

  const ALLOWED_COLUMNS = [
    'title', 'title_ar', 'unit_kind', 'vehicle_category', 'status', 'year', 'mileage_km',
    'vin', 'color', 'color_ar', 'price_egp', 'price_currency', 'negotiable',
    'published', 'model_business_id', 'trim_business_id',
  ];

  if ('vehicle_category' in body && !['car', 'motorcycle', 'scooter', 'commercial'].includes(String(body.vehicle_category))) {
    return err('vehicle_category must be car, motorcycle, scooter, or commercial');
  }

  const sets: string[] = [];
  const vals: unknown[] = [];

  for (const col of ALLOWED_COLUMNS) {
    if (col in body) { sets.push(`${col} = ?`); vals.push(body[col]); }
  }

  // Overrides go through the guard before landing on the row.
  if (body.overrides && typeof body.overrides === 'object') {
    const overrides = body.overrides as Record<string, Record<string, unknown>>;
    try {
      for (const [sectionId, fields] of Object.entries(overrides)) {
        for (const name of Object.keys(fields ?? {})) {
          await assertUnitOverrideKey(sectionId, name);
        }
      }
    } catch (e) { return refuse(e); }
    const existing = unit.overrides ? JSON.parse(unit.overrides as unknown as string) : {};
    const merged = { ...existing, ...overrides };
    sets.push('overrides = ?');
    vals.push(JSON.stringify(merged));
  }

  if (!sets.length) return err('no valid fields to update');

  sets.push('updated_at = ?');
  vals.push(new Date().toISOString(), id);

  await execute(`UPDATE units SET ${sets.join(', ')} WHERE id = ?`, vals);

  // If price changed, record a snapshot so the curve remains provable.
  if ('price_egp' in body) {
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO price_snapshots (id, subject_type, subject_id, price_egp, currency, source_type, source_url, captured_by, captured_at)
       VALUES (?, 'unit', ?, ?, ?, 'dealer_listing', ?, ?, ?)`,
      [
        `ps_${id}_${Date.now().toString(36)}`,
        id,
        body.price_egp ?? 0,
        body.price_currency ?? 'EGP',
        `/u/${unit.slug}`,
        user.id,
        now,
      ],
    );
  }

  return ok({ ok: true, id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth();
  if (!user) return err('unauthorized', 401);
  const { id } = await params;

  const result = await loadAndCheck(id, user);
  if ('error' in result) return result.error;

  await execute(
    "UPDATE units SET status = 'inactive', published = 0, updated_at = ? WHERE id = ?",
    [new Date().toISOString(), id],
  );
  return ok({ ok: true, id, action: 'soft_delete' });
}
