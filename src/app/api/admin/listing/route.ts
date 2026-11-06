/**
 * /api/admin/listing
 *
 * The endpoint the existing `admin/showroom/[id]/inventory/new` form already
 * calls. It was written against the retired `car_listing` kind, so before 0009
 * the endpoint did not exist and the button 404'd. Now a car is a row in
 * `units`, so the endpoint exists and translates the form's legacy shape into
 * unit columns + `overrides`, runs the typology guards, and appends the first
 * `price_snapshot` in the same handler.
 *
 * Two input shapes are accepted on purpose:
 *   - the legacy form's `{ showroom_id, name, name_ar, custom_data }`, so this
 *     page keeps working unchanged;
 *   - a canonical units payload `{ seller_business_id, slug, title, ...columns,
 *     overrides }`, which is what the future vendor dashboard will post.
 *
 * Everything the guards refuse (unknown seller, non-sellable kind, unpublished
 * showroom, an override key `vehicle_model` does not define) returns 409 with
 * the guard's sentence; a validation miss returns 400. Nothing half-writes:
 * the `units` row and its `price_snapshot` are inserted back-to-back, so a
 * refusal on either surface is caught before we touch the table.
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { execute, queryOne } from '@/lib/db';
import {
  TypologyError,
  assertSellable,
  assertUnitOverrideKey,
} from '@/lib/typology';

const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

async function auth(req: Request) {
  const hdrs = await headers();
  const fake = new Request(req.url, { headers: Object.fromEntries(hdrs.entries()) });
  return getAdminUser(fake);
}

function refuse(e: unknown): Response {
  if (e instanceof TypologyError) return err(e.message, 409);
  throw e;
}

/** Condition (a legacy free select) -> the closed unit_kind set 0008 defines. */
function kindFromCondition(condition: unknown): 'new' | 'used' | 'demo' | 'lease_return' {
  const c = String(condition ?? 'New').toLowerCase();
  if (c === 'used') return 'used';
  if (c === 'certified pre-owned') return 'used';
  if (c === 'demo') return 'demo';
  if (c === 'lease return') return 'lease_return';
  return 'new';
}

/** Lowercase-ASCII slug from a title, with a stable fallback so it is never empty. */
function slugify(input: string, fallback: string): string {
  const s = String(input ?? '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || fallback;
}

interface LegacyPayload {
  showroom_id?: string;
  name?: string;
  name_ar?: string;
  custom_data?: Record<string, Record<string, unknown>>;
}

interface ModernPayload {
  seller_business_id?: string;
  owner_business_id?: string | null;
  stock_source?: 'own_stock' | 'on_behalf_of' | 'consignment';
  model_business_id?: string | null;
  trim_business_id?: string | null;
  slug?: string;
  title?: string;
  title_ar?: string | null;
  unit_kind?: 'new' | 'used' | 'demo' | 'lease_return';
  vehicle_category?: 'car' | 'motorcycle' | 'scooter' | 'commercial';
  status?: 'available' | 'reserved' | 'sold' | 'rented' | 'inactive';
  year?: number | null;
  mileage_km?: number | null;
  vin?: string | null;
  color?: string | null;
  color_ar?: string | null;
  price_egp?: number | null;
  price_currency?: string;
  negotiable?: boolean | number;
  overrides?: Record<string, Record<string, unknown>>;
  published?: boolean | number;
}

type Body = LegacyPayload & ModernPayload;

/**
 * Fold the legacy custom_data shape into the canonical unit columns +
 * overrides. Identity strings live in the columns 0008 already provides; the
 * sec_auto_specs block becomes overrides, which is where the guard polices
 * them. Anything else in the legacy body is dropped rather than half-saved.
 */
function normalize(body: Body): ModernPayload {
  if (body.seller_business_id || body.title) {
    // Modern shape: pass through, with a couple of defensive casts.
    return {
      ...body,
      seller_business_id: body.seller_business_id!,
      title: body.title!,
      slug: body.slug ?? slugify(body.title ?? '', `unit-${Date.now()}`),
    };
  }
  const lp = body as LegacyPayload;
  const seller = lp.showroom_id;
  if (!seller) throw new Error('showroom_id or seller_business_id required');
  const price = lp.custom_data?.sec_listing_price ?? {};
  const specs = lp.custom_data?.sec_auto_specs ?? {};
  const overrides: Record<string, Record<string, unknown>> = {};
  if (Object.keys(specs).length) overrides.sec_auto_specs = { ...specs };

  return {
    seller_business_id: seller,
    owner_business_id: seller,
    stock_source: 'own_stock',
    slug: slugify(lp.name ?? lp.name_ar ?? seller, `unit-${Date.now()}`),
    title: lp.name ?? lp.name_ar ?? 'Untitled unit',
    title_ar: lp.name_ar ?? null,
    unit_kind: kindFromCondition(price.condition),
    vehicle_category: (price.vehicle_category as ModernPayload['vehicle_category']) ?? 'car',
    status: 'available',
    year: typeof price.year === 'number' ? price.year : Number(price.year) || null,
    mileage_km: typeof price.mileage_km === 'number' ? price.mileage_km : Number(price.mileage_km) || null,
    vin: (price.vin as string) ?? null,
    color: (price.color as string) ?? null,
    color_ar: (price.color_ar as string) ?? null,
    price_egp: typeof price.price_egp === 'number' ? price.price_egp : Number(price.price_egp) || null,
    price_currency: (price.price_currency as string) ?? 'EGP',
    negotiable: !!price.negotiable,
    overrides,
    published: 1,
  };
}

export async function POST(req: Request) {
  const user = await auth(req);
  if (!user) return err('unauthorized', 401);

  let body: Body;
  try { body = await req.json() as Body; }
  catch { return err('body must be valid JSON'); }

  let unit: ModernPayload;
  try { unit = normalize(body); }
  catch (e) { return err(e instanceof Error ? e.message : String(e)); }
  if (unit.vehicle_category && !['car', 'motorcycle', 'scooter', 'commercial'].includes(unit.vehicle_category)) {
    return err('vehicle_category must be car, motorcycle, scooter, or commercial');
  }

  if (!user.scope_ids.includes('*') && !canAccessBusiness(user, unit.seller_business_id!)) {
    return err('forbidden', 403);
  }

  try {
    // A unit needs a real, published, sellable seller. This is the guard that
    // refuses a factory or a vehicle_model as seller before the row exists.
    const seller = await assertSellable(unit.seller_business_id!);

    // Every override key has to be one the model's kind actually defines.
    // A key the vendor invented would print nowhere and drift everywhere.
    const overrides = unit.overrides ?? {};
    for (const [sectionId, values] of Object.entries(overrides)) {
      for (const name of Object.keys(values ?? {})) {
        await assertUnitOverrideKey(sectionId, name);
      }
    }

    const id = `unit_${unit.slug}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO units (
         id, market_id, seller_business_id, owner_business_id, stock_source,
         model_business_id, trim_business_id,
         slug, title, title_ar, unit_kind, vehicle_category, status,
         year, mileage_km, vin, color, color_ar,
         price_egp, price_currency, negotiable, media, overrides,
         published, created_at, updated_at
       ) VALUES (?, 'automotive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, ?)`,
      [
        id,
        seller.id,
        unit.owner_business_id ?? seller.id,
        unit.stock_source ?? 'own_stock',
        unit.model_business_id ?? null,
        unit.trim_business_id ?? null,
        unit.slug, unit.title, unit.title_ar ?? null,
        unit.unit_kind ?? 'new',
        unit.vehicle_category ?? 'car',
        unit.status ?? 'available',
        unit.year ?? null, unit.mileage_km ?? null,
        unit.vin ?? null, unit.color ?? null, unit.color_ar ?? null,
        unit.price_egp ?? null, unit.price_currency ?? 'EGP',
        unit.negotiable ? 1 : 0,
        JSON.stringify(overrides),
        unit.published ? 1 : 0,
        now, now,
      ],
    );
    // The price at creation is the first provable point on the curve. Same
    // handler, same transaction: a unit without a snapshot is a unit whose
    // current price nobody has claimed to have said.
    if (unit.price_egp != null) {
      await execute(
        `INSERT OR REPLACE INTO price_snapshots
           (id, subject_type, subject_id, price_egp, currency, source_type, source_url, captured_by, captured_at)
         VALUES (?, 'unit', ?, ?, ?, 'dealer_listing', ?, ?, ?)`,
        [
          `ps_${id}`,
          id,
          unit.price_egp,
          unit.price_currency ?? 'EGP',
          `/u/${unit.slug}`,
          user.id,
          now,
        ],
      );
    }

    return ok({ ok: true, id, slug: unit.slug, seller: { id: seller.id, name: seller.name } }, 201);
  } catch (e) {
    return refuse(e);
  }
}

/**
 * GET /api/admin/listing?seller_business_id=… — the raw units row list an admin
 * dashboard uses to reconcile inventory. Filters on the seller for the same
 * reason `unitsBySeller` does; auth scoping still applies through the caller's
 * `canAccessBusiness` check.
 */
export async function GET(req: Request) {
  const user = await auth(req);
  if (!user) return err('unauthorized', 401);
  const { searchParams } = new URL(req.url);
  const seller = searchParams.get('seller_business_id');
  if (!seller) return err('seller_business_id required');
  if (!user.scope_ids.includes('*') && !canAccessBusiness(user, seller)) return err('forbidden', 403);

  const rows = await queryOne<{ n: number }>(
    'SELECT COUNT(*) AS n FROM units WHERE seller_business_id = ?',
    [seller],
  );
  return ok({ seller_business_id: seller, count: rows?.n ?? 0 });
}
