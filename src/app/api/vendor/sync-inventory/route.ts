/**
 * POST /api/vendor/sync-inventory
 *
 * ERP → Marketplace sync endpoint.
 *
 * The Almostashar ERP (mostasharak-accounting.html / serve.js) calls this
 * whenever a car is marked `isPublic = true`. It upserts the car into the
 * platform's `units` table under the authenticated vendor's business.
 *
 * Security model
 * ──────────────
 * - Bearer token in `Authorization: Bearer <vendor_api_key>` header.
 * - The key is matched against `businesses.vendor_api_key` in D1.
 * - If the key is invalid the request is rejected with 401.
 * - Private fields (VIN, chassis, engine number, purchase cost, profit
 *   margin) are stripped server-side before any write — they never appear
 *   in the platform DB even if the ERP accidentally sends them.
 *
 * Request body (JSON)
 * ───────────────────
 * {
 *   "showroomSlug": "almostashar",          // required — identifies vendor
 *   "erp_id":       "inv_2026_001",         // ERP internal reference (idempotency key)
 *   "brand":        "Toyota",
 *   "model":        "Land Cruiser",
 *   "year":         2024,
 *   "color":        "White",
 *   "color_ar":     "أبيض",
 *   "condition":    "New" | "Used",
 *   "mileage_km":   0,
 *   "price_egp":    1850000,
 *   "negotiable":   false,
 *   "transmission": "Automatic",
 *   "engine_cc":    4608,
 *   "arabic_summary": "لاند كروزر 2024 جديدة صفر...",
 *   "photos":       ["https://r2.autofyon.com/...jpg"],   // optional
 *   "is_public":    true
 * }
 *
 * Response
 * ────────
 * 200 { ok: true,  unitSlug, businessId, action: "inserted"|"updated" }
 * 400 { ok: false, error: "..." }
 * 401 { ok: false, error: "unauthorized" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

// ── Fields the ERP must NEVER publish to the platform ──────────────────────
const PRIVATE_FIELDS = new Set([
  'vin', 'chassis_no', 'engine_no', 'purchase_price', 'cost',
  'profit', 'margin', 'supplier', 'invoice_no',
]);

// ── Slugify a string into a URL-safe identifier ─────────────────────────────
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ── Validate & sanitize the request body ───────────────────────────────────
interface SyncPayload {
  showroomSlug: string;
  erp_id:       string;
  brand:        string;
  model:        string;
  year?:        number;
  color?:       string;
  color_ar?:    string;
  condition?:   string;
  mileage_km?:  number;
  price_egp?:   number;
  negotiable?:  boolean;
  transmission?:string;
  engine_cc?:   number;
  arabic_summary?: string;
  photos?:      string[];
  is_public?:   boolean;
}

function sanitize(raw: Record<string, unknown>): SyncPayload | { _error: string } {
  // Strip private fields
  for (const key of Object.keys(raw)) {
    if (PRIVATE_FIELDS.has(key.toLowerCase())) delete raw[key];
  }

  const { showroomSlug, erp_id, brand, model } = raw as Record<string, unknown>;
  if (!showroomSlug || typeof showroomSlug !== 'string') return { _error: 'showroomSlug is required' };
  if (!erp_id      || typeof erp_id      !== 'string') return { _error: 'erp_id is required' };
  if (!brand       || typeof brand       !== 'string') return { _error: 'brand is required' };
  if (!model       || typeof model       !== 'string') return { _error: 'model is required' };

  return raw as unknown as SyncPayload;
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth: Bearer token
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // 2. Look up vendor by API key
  const vendor = await queryOne<{ id: string; slug: string; status: string }>(
    `SELECT id, slug, status FROM businesses
      WHERE vendor_api_key = ? AND published = 1 LIMIT 1`,
    [token],
  );
  if (!vendor || vendor.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // 3. Parse & sanitize body
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 }); }

  const payload = sanitize(body);
  if ('_error' in payload) {
    return NextResponse.json({ ok: false, error: payload._error }, { status: 400 });
  }

  // 4. Verify showroomSlug matches the authenticated vendor
  if (payload.showroomSlug !== vendor.slug) {
    return NextResponse.json(
      { ok: false, error: `showroomSlug mismatch: token is for "${vendor.slug}"` },
      { status: 403 },
    );
  }

  // 5. Build a stable unit slug from erp_id (idempotency)
  const unitSlug = `${vendor.slug}-${slugify(payload.erp_id)}`;
  const title    = `${payload.brand} ${payload.model}${payload.year ? ' ' + payload.year : ''}`;
  const titleAr  = payload.arabic_summary
    ? payload.arabic_summary.slice(0, 120)
    : title;

  // Build overrides JSON (specs stored as a mini custom_data bag)
  const overrides = JSON.stringify({
    sec_auto_specs: {
      ...(payload.transmission  ? { transmission_type: payload.transmission } : {}),
      ...(payload.engine_cc     ? { displacement_cc:   payload.engine_cc }    : {}),
    },
    sec_listing_price: {
      ...(payload.condition     ? { condition:   payload.condition }   : {}),
      ...(payload.price_egp !== undefined ? { price_egp: payload.price_egp } : {}),
      ...(payload.negotiable !== undefined ? { negotiable: payload.negotiable } : {}),
      ...(payload.mileage_km !== undefined ? { mileage_km: payload.mileage_km } : {}),
      ...(payload.year      !== undefined ? { year:       payload.year }       : {}),
      ...(payload.color         ? { color:    payload.color }    : {}),
      ...(payload.color_ar      ? { color_ar: payload.color_ar } : {}),
    },
    ...(payload.arabic_summary ? { sec_1_identity: { arabic_summary: payload.arabic_summary } } : {}),
  });

  // 6. Upsert into units table
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM units WHERE slug = ? AND seller_business_id = ? LIMIT 1`,
    [unitSlug, vendor.id],
  );

  let action: 'inserted' | 'updated';

  if (existing) {
    await execute(
      `UPDATE units SET
         title        = ?,
         title_ar     = ?,
         price_egp    = ?,
         year         = ?,
         mileage_km   = ?,
         color        = ?,
         color_ar     = ?,
         negotiable   = ?,
         overrides    = ?,
         status       = 'available',
         published    = ?,
         updated_at   = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title, titleAr,
        payload.price_egp     ?? null,
        payload.year          ?? null,
        payload.mileage_km    ?? null,
        payload.color         ?? null,
        payload.color_ar      ?? null,
        payload.negotiable    ? 1 : 0,
        overrides,
        payload.is_public !== false ? 1 : 0,
        existing.id,
      ],
    );
    action = 'updated';

    // Update photos if supplied
    if (payload.photos?.length) {
      await _upsertPhotos(existing.id, vendor.id, payload.photos);
    }
  } else {
    const unitId = `unit_${vendor.slug}_${Date.now()}`;
    await execute(
      `INSERT INTO units
         (id, slug, title, title_ar, unit_kind, vehicle_category,
          status, stock_source, price_egp, price_currency,
          year, mileage_km, color, color_ar, negotiable,
          seller_business_id, overrides, published, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [
        unitId, unitSlug, title, titleAr,
        payload.condition === 'Used' || payload.condition === 'مستعملة' ? 'used' : 'new', // unit_kind
        'car', // vehicle_category
        'available',                        // status
        'own_stock',                        // stock_source
        payload.price_egp     ?? null,
        'EGP',
        payload.year          ?? null,
        payload.mileage_km    ?? null,
        payload.color         ?? null,
        payload.color_ar      ?? null,
        payload.negotiable    ? 1 : 0,
        vendor.id,
        overrides,
        payload.is_public !== false ? 1 : 0,
      ],
    );
    action = 'inserted';

    if (payload.photos?.length) {
      await _upsertPhotos(unitId, vendor.id, payload.photos);
    }
  }

  return NextResponse.json({ ok: true, unitSlug, businessId: vendor.id, action });
}

// ── Photo helper: insert gallery rows for a unit ────────────────────────────
async function _upsertPhotos(unitId: string, businessId: string, photos: string[]) {
  // Clear old auto-synced photos for this unit first
  await execute(
    `DELETE FROM vendor_gallery WHERE unit_id = ? AND business_id = ? AND approval_status = 'auto_sync'`,
    [unitId, businessId],
  );

  for (let i = 0; i < photos.length; i++) {
    const url = photos[i];
    if (!url || typeof url !== 'string') continue;
    const galleryId = `gal_${unitId}_${i}`;
    await execute(
      `INSERT OR REPLACE INTO vendor_gallery
         (id, business_id, unit_id, section_id, url, display_order,
          placement, is_hero, show_on_minisite, approval_status,
          media_type)
       VALUES (?,?,?,'sec_auto_exterior',?,?,?,?,1,'auto_sync','image')`,
      [galleryId, businessId, unitId, url, i + 1, i === 0 ? 'carousel' : 'body', i === 0 ? 1 : 0],
    );
  }
}
