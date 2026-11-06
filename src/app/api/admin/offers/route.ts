/**
 * /api/admin/offers — vendor offers (model-level price claims).
 *
 * GET   → list published offers for a model
 * POST  → create or upsert an offer (guarded by assertOfferAuthority)
 * PATCH → update an offer by id
 *
 * An offer is a seller's public claim about what a MODEL costs from them.
 * The authority guard enforces the chain: only a main_agency can claim
 * agency_official; a showroom can only claim dealer.
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { query, queryOne, execute } from '@/lib/db';
import { TypologyError, assertOfferAuthority } from '@/lib/typology';

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

export async function GET(req: Request) {
  const user = await auth();
  if (!user) return err('unauthorized', 401);
  const { searchParams } = new URL(req.url);
  const modelId = searchParams.get('model_business_id');
  if (!modelId) return err('model_business_id required');

  const offers = await query(
    `SELECT o.*, b.name AS seller_name, b.name_ar AS seller_name_ar, b.slug AS seller_slug
       FROM unit_offers o
       JOIN businesses b ON b.id = o.seller_business_id
      WHERE o.model_business_id = ? AND o.published = 1
      ORDER BY (o.authority = 'agency_official') DESC, o.price_from_egp ASC`,
    [modelId],
  );
  return ok({ offers });
}

export async function POST(req: Request) {
  const user = await auth();
  if (!user) return err('unauthorized', 401);

  let body: {
    model_business_id?: string;
    seller_business_id?: string;
    trim?: string;
    unit_kind?: string;
    authority?: string;
    price_from_egp?: number | null;
    price_to_egp?: number | null;
    availability_note?: string | null;
    availability_note_ar?: string | null;
    published?: number;
  };
  try { body = await req.json(); }
  catch { return err('body must be valid JSON'); }

  if (!body.model_business_id || !body.seller_business_id || !body.authority) {
    return err('model_business_id, seller_business_id, and authority are required');
  }

  if (!user.scope_ids.includes('*') && !canAccessBusiness(user, body.seller_business_id)) {
    return err('forbidden', 403);
  }

  try {
    await assertOfferAuthority(body.seller_business_id, body.authority);
  } catch (e) { return refuse(e); }

  const id = `offer_${body.model_business_id.slice(0, 8)}_${body.seller_business_id.slice(0, 8)}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  await execute(
    `INSERT OR REPLACE INTO unit_offers
       (id, model_business_id, seller_business_id, trim, unit_kind, authority,
        price_from_egp, price_to_egp, availability_note, availability_note_ar,
        published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, body.model_business_id, body.seller_business_id,
      body.trim ?? '', body.unit_kind ?? '', body.authority,
      body.price_from_egp ?? null, body.price_to_egp ?? null,
      body.availability_note ?? null, body.availability_note_ar ?? null,
      body.published ?? 1, now, now,
    ],
  );

  return ok({ ok: true, id }, 201);
}

export async function PATCH(req: Request) {
  const user = await auth();
  if (!user) return err('unauthorized', 401);

  let body: Record<string, unknown> & { id?: string };
  try { body = await req.json(); }
  catch { return err('body must be valid JSON'); }

  if (!body.id) return err('id required');

  const offer = await queryOne<{ id: string; seller_business_id: string }>(
    'SELECT id, seller_business_id FROM unit_offers WHERE id = ?', [body.id],
  );
  if (!offer) return err('offer not found', 404);
  if (!user.scope_ids.includes('*') && !canAccessBusiness(user, offer.seller_business_id)) {
    return err('forbidden', 403);
  }

  const ALLOWED = ['price_from_egp', 'price_to_egp', 'availability_note', 'availability_note_ar', 'published'];
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const col of ALLOWED) {
    if (col in body) { sets.push(`${col} = ?`); vals.push(body[col]); }
  }
  if (!sets.length) return err('no valid fields to update');

  sets.push('updated_at = ?');
  vals.push(new Date().toISOString(), body.id);

  await execute(`UPDATE unit_offers SET ${sets.join(', ')} WHERE id = ?`, vals);
  return ok({ ok: true, id: body.id });
}
