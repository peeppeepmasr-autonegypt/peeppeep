/**
 * Units — the read path (D1 / SQLite).
 *
 * Ported from siwa-oasis `src/lib/developments.ts` (its reading half), with the
 * domain swapped the way this project's contract defines it: a developer becomes
 * a showroom, a project becomes a vehicle model, and a unit becomes one car — a
 * row with a price, a status and its own photographs, but no typology of its own.
 *
 * Three rules the reference earned the hard way and this file keeps:
 *  - a comparison the data cannot support is not printed (a spread needs asks);
 *  - a price is never shown without saying who said it and when;
 *  - a missing fact reads as missing. Inventing a plausible number is how a
 *    marketplace teaches buyers to distrust it.
 */
import { query, queryOne, parseJson } from '@/lib/db';
import {
  loadAuthoredShelves, contactFor,
  type AuthoredReading,
} from '@/lib/minisite';
import { SPEC_TYPE } from '@/lib/typology';
import { localePath, type SiteLocale } from '@/lib/site-locale';
import { loadSiteProfile, type SiteProfile } from '@/lib/site-builder';
import {
  priceSourceLabel, priceSourceRank, isPriceSource,
  type UnitKind, type UnitStatus, type StockSource,
} from '@/lib/unit-terms';

// ── shapes ────────────────────────────────────────────────────────────────────
export interface UnitRecord {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  unit_kind: UnitKind;
  vehicle_category: string;
  status: UnitStatus;
  stock_source: StockSource;
  year: number | null;
  mileage_km: number | null;
  vin: string | null;
  color: string | null;
  color_ar: string | null;
  price_egp: number | null;
  price_currency: string;
  negotiable: number;
  seller_business_id: string;
  owner_business_id: string | null;
  model_business_id: string | null;
  trim_business_id: string | null;
  overrides: Record<string, Record<string, unknown>>;
  published: number;
  created_at: string;
  updated_at: string;
}

type RawUnit = Omit<UnitRecord, 'overrides' | 'unit_kind' | 'status' | 'stock_source'> & {
  overrides: string | null;
  unit_kind: string;
  status: string;
  stock_source: string;
};

/** A business a unit touches: its seller, its model, its trim. */
export interface UnitParty {
  id: string; slug: string; name: string; name_ar: string | null; type_id: string;
}

/** One recorded price. Append-only in the database; read here as history. */
export interface PricePoint {
  priceEgp: number;
  currency: string;
  sourceType: string;
  sourceUrl: string | null;
  capturedAt: string;
}

export interface PricePlate {
  priceEgp: number | null;
  currency: string;
  negotiable: boolean;
  /**
   * The record that states THIS number. A price with no matching snapshot is a
   * price nobody said, so `said` stays null and the view prints the figure
   * without a badge rather than crediting some older row for it.
   */
  said: { sourceType: string; label: string; labelAr: string; rank: number; capturedAt: string } | null;
  /** True when history exists but no entry states the current price. */
  unattributed: boolean;
  /** Oldest to newest, so a fall reads as a fall. */
  movement: { fromEgp: number; toEgp: number; deltaEgp: number; fromCapturedAt: string } | null;
}

/**
 * What this model is going for, beside what it is officially listed at.
 *
 * `official` is null when no agency published a list — which is the normal state
 * of a young market and must be visible as such. `asks` is computed from rows
 * that exist; `basis` says which table they came from, because "three dealers are
 * asking" and "the market price is" are different claims.
 */
export interface MarketSpread {
  modelBusinessId: string;
  official: {
    sellerName: string; sellerNameAr: string | null; priceFromEgp: number | null;
    priceToEgp: number | null; authority: string; updatedAt: string;
  } | null;
  asks: { min: number; median: number; max: number; count: number } | null;
  basis: 'offers' | 'live_units' | 'none';
}

export interface ContractTerms {
  subjectType: 'model' | 'unit';
  maintenanceNote: string | null;
  maintenanceDueTiming: string | null;
  transferFeeEgp: number | null;
  brokerCommissionPct: number | null;
  adminFeeEgp: number | null;
  lateDeliveryTerms: string | null;
  latePaymentTerms: string | null;
  vatPct: number | null;
  updatedAt: string;
}

/** A card in a strip: the shelf's unit, with the two facts a buyer scans for. */
export interface UnitCard {
  id: string;
  slug: string;
  title: string;
  unitKind: string;
  status: string;
  year: number | null;
  mileageKm: number | null;
  priceEgp: number | null;
  currency: string;
  negotiable: boolean;
  sellerSlug: string;
  sellerName: string;
  modelSlug: string | null;
  /** The car's own approved photograph, or null when none exists yet. */
  imageUrl: string | null;
  href: string;
}

export interface UnitPage {
  locale: SiteLocale;
  siteProfile: SiteProfile;
  unit: UnitRecord;
  seller: UnitParty;
  /** The model node when one is registered; null is honest, not a gap to fill. */
  model: UnitParty | null;
  trim: UnitParty | null;
  /** Model answers with this car's overrides merged over them. */
  values: Record<string, Record<string, unknown>>;
  reading: AuthoredReading;
  price: PricePlate;
  history: PricePoint[];
  spread: MarketSpread | null;
  terms: ContractTerms | null;
  /** The seller's reachable details, resolved by the minisite's own rule. */
  contact: Record<string, unknown>;
  /** The same seller's other units, preferring the same model. */
  siblings: UnitCard[];
  canonicalPath: string;
}

// ── urls ──────────────────────────────────────────────────────────────────────
/**
 * The canonical home of a car: under the showroom that sells it. A unit is not a
 * business, so it gets a path beneath one rather than a slot in the slug namespace.
 */
export function unitPath(locale: SiteLocale, sellerSlug: string, unitSlug: string): string {
  return localePath(locale, [sellerSlug, 'u', unitSlug]);
}

/** The short link worth typing into WhatsApp; it redirects to the canonical path. */
export function unitShortPath(locale: SiteLocale, unitSlug: string): string {
  return localePath(locale, ['u', unitSlug]);
}

// ── the merge that makes a unit page a unit page ──────────────────────────────
/**
 * Model answers, with this car's overrides laid over them.
 *
 * Section by section and key by key, so a car that disagrees about paint colour
 * still inherits everything the model authored. A `null` override means *this
 * chassis has no answer*, not *copy the model's* — silently inheriting would
 * advertise a specification the seller never claimed for this car.
 */
export function specWithOverrides(
  host: Record<string, Record<string, unknown>> | null,
  overrides: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [sectionId, bag] of Object.entries(host ?? {})) {
    if (bag && typeof bag === 'object' && !Array.isArray(bag)) out[sectionId] = { ...bag };
  }
  for (const [sectionId, bag] of Object.entries(overrides ?? {})) {
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) continue;
    const target = out[sectionId] ?? {};
    for (const [key, value] of Object.entries(bag)) {
      if (value === undefined) continue;
      target[key] = value;
    }
    out[sectionId] = target;
  }
  return out;
}

function toUnit(row: RawUnit): UnitRecord {
  return {
    ...row,
    overrides: parseJson<Record<string, Record<string, unknown>>>(row.overrides, {}),
    unit_kind: row.unit_kind as UnitKind,
    status: row.status as UnitStatus,
    stock_source: row.stock_source as StockSource,
  };
}

const UNIT_COLUMNS = `u.id, u.slug, u.title, u.title_ar, u.unit_kind, u.status, u.stock_source,
  u.vehicle_category,
  u.year, u.mileage_km, u.vin, u.color, u.color_ar, u.price_egp, u.price_currency, u.negotiable,
  u.seller_business_id, u.owner_business_id, u.model_business_id, u.trim_business_id,
  u.overrides, u.published, u.created_at, u.updated_at`;

// ── price provenance ──────────────────────────────────────────────────────────
/** Newest first. The table is append-only, so this is a record, not a guess. */
export async function priceHistory(
  subjectType: 'unit' | 'offer',
  subjectId: string,
): Promise<PricePoint[]> {
  const rows = await query<{
    price_egp: number; currency: string; source_type: string;
    source_url: string | null; captured_at: string;
  }>(
    `SELECT price_egp, currency, source_type, source_url, captured_at
       FROM price_snapshots
      WHERE subject_type = ? AND subject_id = ?
      ORDER BY captured_at DESC, id DESC`,
    [subjectType, subjectId],
  );
  return rows.map((r) => ({
    priceEgp: r.price_egp,
    currency: r.currency,
    sourceType: r.source_type,
    sourceUrl: r.source_url,
    capturedAt: r.captured_at,
  }));
}

/**
 * The current number and the record that states it.
 *
 * Matching on the value rather than taking the newest row is deliberate: a
 * showroom that edited `units.price_egp` without writing a snapshot has a price
 * with no provenance, and attributing yesterday's number to it would be a
 * fabrication dressed as a citation.
 */
export function buildPricePlate(unit: UnitRecord, history: PricePoint[]): PricePlate {
  const stated = history.find((p) => p.priceEgp === unit.price_egp) ?? null;
  const oldest = history.length ? history[history.length - 1] : null;
  const newest = history.length ? history[0] : null;
  const movement = stated && oldest && newest && oldest.priceEgp !== newest.priceEgp
    ? {
        fromEgp: oldest.priceEgp,
        toEgp: newest.priceEgp,
        deltaEgp: newest.priceEgp - oldest.priceEgp,
        fromCapturedAt: oldest.capturedAt,
      }
    : null;
  return {
    priceEgp: unit.price_egp,
    currency: unit.price_currency,
    negotiable: unit.negotiable === 1,
    said: stated && isPriceSource(stated.sourceType)
      ? {
          sourceType: stated.sourceType,
          label: priceSourceLabel(stated.sourceType, false) ?? stated.sourceType,
          labelAr: priceSourceLabel(stated.sourceType, true) ?? stated.sourceType,
          rank: priceSourceRank(stated.sourceType),
          capturedAt: stated.capturedAt,
        }
      : null,
    unattributed: history.length > 0 && !stated,
    movement,
  };
}

// ── comparable asks ───────────────────────────────────────────────────────────
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // The midpoint of two asks is not an ask anybody made, so it is rounded back to
  // a rial: a fraction of a pound is a display artefact, not a fact.
  const raw = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(raw);
}

function spreadOf(numbers: number[]): MarketSpread['asks'] {
  const clean = numbers.filter((n) => Number.isFinite(n) && n > 0);
  if (!clean.length) return null;
  return {
    min: Math.min(...clean),
    median: median(clean),
    max: Math.max(...clean),
    count: clean.length,
  };
}

/**
 * The model's official list beside the range actually being asked.
 *
 * Offers first, because an offer is a seller standing behind a range for a trim
 * and a condition. Only when nobody has published an offer does the reading fall
 * back to live units — and it says so in `basis`, so the page can call it what it
 * is instead of calling it the market.
 */
export async function marketSpread(modelBusinessId: string): Promise<MarketSpread> {
  const official = await queryOne<{
    seller_name: string; seller_name_ar: string | null; authority: string;
    price_from_egp: number | null; price_to_egp: number | null; updated_at: string;
  }>(
    `SELECT o.authority, o.price_from_egp, o.price_to_egp, o.updated_at,
            b.name AS seller_name, b.name_ar AS seller_name_ar
       FROM unit_offers o
       JOIN businesses b ON b.id = o.seller_business_id
      WHERE o.model_business_id = ? AND o.authority = 'agency_official' AND o.published = 1
      ORDER BY o.updated_at DESC
      LIMIT 1`,
    [modelBusinessId],
  );

  const offerRows = await query<{ price_from_egp: number | null; price_to_egp: number | null }>(
    `SELECT price_from_egp, price_to_egp
       FROM unit_offers
      WHERE model_business_id = ? AND published = 1
        AND (price_from_egp IS NOT NULL OR price_to_egp IS NOT NULL)`,
    [modelBusinessId],
  );

  const numbers: number[] = [];
  for (const r of offerRows) {
    if (r.price_from_egp != null) numbers.push(r.price_from_egp);
    if (r.price_to_egp != null) numbers.push(r.price_to_egp);
  }

  let basis: MarketSpread['basis'] = 'offers';
  if (!numbers.length) {
    const units = await query<{ price_egp: number | null }>(
      `SELECT price_egp FROM units
        WHERE model_business_id = ? AND published = 1 AND status = 'available'
          AND price_egp IS NOT NULL`,
      [modelBusinessId],
    );
    for (const u of units) if (u.price_egp != null) numbers.push(u.price_egp);
    basis = numbers.length ? 'live_units' : 'none';
  }

  return {
    modelBusinessId,
    official: official
      ? {
          sellerName: official.seller_name,
          sellerNameAr: official.seller_name_ar,
          priceFromEgp: official.price_from_egp,
          priceToEgp: official.price_to_egp,
          authority: official.authority,
          updatedAt: official.updated_at,
        }
      : null,
    asks: spreadOf(numbers),
    basis,
  };
}

// ── contract terms ────────────────────────────────────────────────────────────
/**
 * The deciding numbers, and the reason `contract_terms` exists.
 *
 * A unit row replaces the model's row wholesale rather than merging field by
 * field: a half-inherited contract is a contract nobody signed, and a seller who
 * takes the trouble to state transfer fees for one chassis should not have the
 * rest of its terms quietly copied from a model page.
 */
export async function contractTerms(
  unitId: string,
  modelBusinessId: string | null,
): Promise<ContractTerms | null> {
  const subjects = [
    { type: 'unit', id: unitId },
    ...(modelBusinessId ? [{ type: 'model', id: modelBusinessId }] : []),
  ];
  for (const s of subjects) {
    const r = await queryOne<Record<string, unknown>>(
      `SELECT * FROM contract_terms WHERE subject_type = ? AND subject_id = ? LIMIT 1`,
      [s.type, s.id],
    );
    if (!r) continue;
    return {
      subjectType: s.type as ContractTerms['subjectType'],
      maintenanceNote: (r.maintenance_note as string | null) ?? null,
      maintenanceDueTiming: (r.maintenance_due_timing as string | null) ?? null,
      transferFeeEgp: (r.transfer_fee_egp as number | null) ?? null,
      brokerCommissionPct: (r.broker_commission_pct as number | null) ?? null,
      adminFeeEgp: (r.admin_fee_egp as number | null) ?? null,
      lateDeliveryTerms: (r.late_delivery_terms as string | null) ?? null,
      latePaymentTerms: (r.late_payment_terms as string | null) ?? null,
      vatPct: (r.vat_pct as number | null) ?? null,
      updatedAt: String(r.updated_at ?? ''),
    };
  }
  return null;
}

// ── the page ──────────────────────────────────────────────────────────────────
/**
 * One car, ready to render: its columns, the model's authored answers with its
 * overrides merged over them, its own photographs, its price with its provenance,
 * the market beside it, and the number to call.
 */
export async function loadUnit(
  slug: string,
  locale: SiteLocale,
  opts: { drafts?: boolean } = {},
): Promise<UnitPage | null> {
  const row = await queryOne<RawUnit>(
    `SELECT ${UNIT_COLUMNS} FROM units u
      WHERE u.slug = ?${opts.drafts ? '' : ' AND u.published = 1'}`,
    [slug],
  );
  if (!row) return null;
  const unit = toUnit(row);

  const partyIds = [unit.seller_business_id, unit.model_business_id, unit.trim_business_id]
    .filter((v): v is string => Boolean(v));
  const ph = partyIds.map(() => '?').join(',');
  const parties = await query<UnitParty & { custom_data: string | null }>(
    `SELECT id, slug, name, name_ar, type_id, custom_data FROM businesses WHERE id IN (${ph})`,
    partyIds,
  );
  const byId = new Map(parties.map((p) => [p.id, p]));

  const seller = byId.get(unit.seller_business_id);
  // A unit whose seller is gone has nobody to call and nobody accountable for the
  // price. It is not a page, and 404 is the honest answer.
  if (!seller) return null;
  const model = unit.model_business_id ? byId.get(unit.model_business_id) ?? null : null;
  const trim = unit.trim_business_id ? byId.get(unit.trim_business_id) ?? null : null;

  const values = specWithOverrides(
    model ? parseJson<Record<string, Record<string, unknown>>>(model.custom_data, {}) : {},
    unit.overrides,
  );

  const reading = await loadAuthoredShelves({
    hostBusinessId: model?.id ?? seller.id,
    hostTypeId: SPEC_TYPE,
    values,
    locale,
    // Media is billed to the account that photographed the car, which is the
    // seller even when the definitions came from a model another party owns.
    mediaBusinessId: seller.id,
    mediaUnitId: unit.id,
  });

  const history = await priceHistory('unit', unit.id);
  const siblings = model
    ? await unitsByModel(model.id, { locale, excludeId: unit.id, limit: 4 })
    : await unitsBySeller(seller.id, { locale, excludeId: unit.id, limit: 4 });

  return {
    locale,
    siteProfile: await loadSiteProfile('unit', unit.id),
    unit,
    seller,
    model,
    trim,
    values,
    reading,
    price: buildPricePlate(unit, history),
    history,
    spread: model ? await marketSpread(model.id) : null,
    terms: await contractTerms(unit.id, model?.id ?? null),
    contact: await contactFor(seller.id),
    siblings,
    canonicalPath: unitPath(locale, seller.slug, unit.slug),
  };
}

/** Look up only what a redirect needs: whose car this is, so its path can be built. */
export async function unitOwner(slug: string): Promise<{ sellerSlug: string; unitSlug: string } | null> {
  const row = await queryOne<{ seller_slug: string; unit_slug: string }>(
    `SELECT s.slug AS seller_slug, u.slug AS unit_slug
       FROM units u JOIN businesses s ON s.id = u.seller_business_id
      WHERE u.slug = ?`,
    [slug],
  );
  return row ? { sellerSlug: row.seller_slug, unitSlug: row.unit_slug } : null;
}

// ── strips and shelves ────────────────────────────────────────────────────────
interface CardRow {
  id: string; slug: string; title: string; title_ar: string | null;
  unit_kind: string; status: string; year: number | null; mileage_km: number | null;
  price_egp: number | null; price_currency: string; negotiable: number;
  seller_slug: string; seller_name: string; seller_name_ar: string | null;
  model_slug: string | null;
}

const CARD_SELECT = `SELECT u.id, u.slug, u.title, u.title_ar, u.unit_kind, u.status,
    u.year, u.mileage_km, u.price_egp, u.price_currency, u.negotiable,
    s.slug AS seller_slug, s.name AS seller_name, s.name_ar AS seller_name_ar,
    m.slug AS model_slug
  FROM units u
  JOIN businesses s ON s.id = u.seller_business_id
  LEFT JOIN businesses m ON m.id = u.model_business_id`;

/**
 * The card's photograph.
 *
 * Only this unit's approved rows, ordered so a declared hero wins. A video is
 * allowed as a thumbnail because its poster IS a photograph of this chassis; a
 * typographic slide is not, and printing one as a card image would be a lie about
 * what was shot.
 */
async function heroPhotos(unitIds: string[]): Promise<Map<string, string>> {
  if (!unitIds.length) return new Map();
  const ph = unitIds.map(() => '?').join(',');
  const rows = await query<{ unit_id: string; url: string }>(
    `SELECT unit_id, url FROM vendor_gallery
      WHERE unit_id IN (${ph}) AND show_on_minisite = 1 AND approval_status = 'approved'
        AND (media_type IS NULL OR media_type = 'image' OR media_type = 'youtube')
        AND url IS NOT NULL AND url <> ''
      ORDER BY is_hero DESC, display_order`,
    unitIds,
  );
  const first = new Map<string, string>();
  for (const r of rows) if (!first.has(r.unit_id)) first.set(r.unit_id, r.url);
  return first;
}

async function toCards(rows: CardRow[], locale: SiteLocale): Promise<UnitCard[]> {
  const photos = await heroPhotos(rows.map((r) => r.id));
  const ar = locale === 'ar';
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: ar ? (r.title_ar?.trim() || 'مركبة') : r.title,
    unitKind: r.unit_kind,
    status: r.status,
    year: r.year,
    mileageKm: r.mileage_km,
    priceEgp: r.price_egp,
    currency: r.price_currency,
    negotiable: r.negotiable === 1,
    sellerSlug: r.seller_slug,
    sellerName: locale === 'ar' ? (r.seller_name_ar?.trim() || 'المعرض') : r.seller_name,
    modelSlug: r.model_slug,
    imageUrl: photos.get(r.id) ?? null,
    href: unitPath(locale, r.seller_slug, r.slug),
  }));
}

interface StripOpts {
  locale: SiteLocale;
  /** Drafts are for the vendor's own dashboard; a public strip must not show them. */
  drafts?: boolean;
  /** Also show reserved and sold cars, marked as such rather than hidden. */
  includeTaken?: boolean;
  excludeId?: string;
  limit?: number;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'mileage_asc';
}

function stripFilter(opts: StripOpts): { where: string[]; params: unknown[]; order: string } {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!opts.drafts) where.push('u.published = 1');
  // A sold car still belongs on a model page: it is proof the seller moves stock.
  // It is the ones nobody is asking for that stay off a public strip.
  if (!opts.includeTaken) where.push("u.status <> 'inactive'");
  if (opts.excludeId) { where.push('u.id <> ?'); params.push(opts.excludeId); }
  const order =
    opts.sort === 'price_asc' ? '(u.price_egp IS NULL), u.price_egp ASC'
    : opts.sort === 'price_desc' ? 'u.price_egp DESC'
    : opts.sort === 'mileage_asc' ? '(u.mileage_km IS NULL), u.mileage_km ASC'
    : 'u.updated_at DESC';
  return { where, params, order };
}

/** `AND a AND b`, or nothing at all when the caller asked for every row. */
const andAll = (where: string[]): string => (where.length ? `AND ${where.join(' AND ')}` : '');

/**
 * Everything one seller currently has, newest first.
 *
 * Every row whose `seller_business_id` is this account is included, whatever
 * `stock_source` says: a car listed by a showroom is on the showroom's page even
 * if the row is inconsistent about whose stock it is. Inconsistency is corrected
 * at write time by the typology guards, never by hiding inventory from the public.
 */
export async function unitsBySeller(
  sellerBusinessId: string,
  opts: StripOpts,
): Promise<UnitCard[]> {
  const f = stripFilter(opts);
  const rows = await query<CardRow>(
    `${CARD_SELECT}
      WHERE u.seller_business_id = ? ${andAll(f.where)}
      ORDER BY ${f.order}, u.title
      ${opts.limit ? `LIMIT ${Math.trunc(opts.limit)}` : ''}`,
    [sellerBusinessId, ...f.params],
  );
  return toCards(rows, opts.locale);
}

/** Every ask on one model, across every seller — the model page's unit strip. */
export async function unitsByModel(modelBusinessId: string, opts: StripOpts): Promise<UnitCard[]> {
  const f = stripFilter(opts);
  const rows = await query<CardRow>(
    `${CARD_SELECT}
      WHERE u.model_business_id = ? ${andAll(f.where)}
      ORDER BY ${f.order}, u.title
      ${opts.limit ? `LIMIT ${Math.trunc(opts.limit)}` : ''}`,
    [modelBusinessId, ...f.params],
  );
  return toCards(rows, opts.locale);
}

/**
 * A showroom's stock, grouped under the models it sells.
 *
 * This is the shelf the reference would call "available units" and a visitor calls
 * "what can I actually buy here today". Units with no registered model group under
 * a null name: the page labels them, and inventing a model node to avoid an
 * untidy group would be the portal writing fiction into the typology.
 */
export interface AvailabilityGroup {
  modelBusinessId: string | null;
  modelName: string | null;
  modelNameAr: string | null;
  modelSlug: string | null;
  total: number;
  available: number;
  byKind: Record<string, number>;
  priceFromEgp: number | null;
  priceToEgp: number | null;
  units: UnitCard[];
}

export async function availabilityForSeller(
  sellerBusinessId: string,
  locale: SiteLocale,
): Promise<AvailabilityGroup[]> {
  const rows = await query<CardRow>(
    `${CARD_SELECT}
      WHERE u.seller_business_id = ? AND u.published = 1 AND u.status <> 'inactive'
      ORDER BY m.name, u.title`,
    [sellerBusinessId],
  );
  const cards = await toCards(rows, locale);
  const groups = new Map<string, AvailabilityGroup>();
  rows.forEach((r, i) => {
    const key = r.model_slug ? `m:${r.model_slug}` : 'm:none';
    let g = groups.get(key);
    if (!g) {
      g = {
        modelBusinessId: null, modelName: null, modelNameAr: null, modelSlug: r.model_slug,
        total: 0, available: 0, byKind: {}, priceFromEgp: null, priceToEgp: null, units: [],
      };
      groups.set(key, g);
    }
    g.total += 1;
    if (r.status === 'available') g.available += 1;
    g.byKind[r.unit_kind] = (g.byKind[r.unit_kind] ?? 0) + 1;
    g.units.push(cards[i]);
    if (r.price_egp != null) {
      g.priceFromEgp = g.priceFromEgp == null ? r.price_egp : Math.min(g.priceFromEgp, r.price_egp);
      g.priceToEgp = g.priceToEgp == null ? r.price_egp : Math.max(g.priceToEgp, r.price_egp);
    }
  });

  // Names arrive from the model nodes, in one query, for the groups that have one.
  const ids = [...groups.values()].map((g) => g.modelSlug).filter((v): v is string => Boolean(v));
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const named = await query<{ slug: string; name: string; name_ar: string | null; id: string }>(
      `SELECT id, slug, name, name_ar FROM businesses WHERE slug IN (${ph}) AND type_id = ?`,
      [...ids, SPEC_TYPE],
    );
    for (const n of named) {
      const g = groups.get(`m:${n.slug}`);
      if (g) { g.modelBusinessId = n.id; g.modelName = n.name; g.modelNameAr = n.name_ar; }
    }
  }
  return [...groups.values()];
}

// ── public catalog: search, facets, brand directory ───────────────────────────
/**
 * Filters a visitor can apply on the /cars browse.
 *
 * Everything is optional and everything is additive; an unset facet does not
 * appear in the WHERE clause at all. The catalog is intentionally read-only and
 * public-safe: `published = 1 AND status <> 'inactive'` is hard-coded so a
 * mis-set flag can never leak a draft to the market.
 */
export interface SearchOpts {
  locale: SiteLocale;
  /** vehicle_brand slug (via the unit's model → parent). */
  brand?: string;
  /** vehicle_model slug. */
  model?: string;
  /** seller business slug. */
  seller?: string;
  /** one of UNIT_KINDS. */
  kind?: string;
  /** car | motorcycle | scooter | commercial */
  category?: string;
  /** a vehicle seller type_id: showroom | used_car_dealer | agent_broker | distributor | main_agency. */
  sellerType?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  mileageMax?: number;
  /** Free-text across title / title_ar / seller name. */
  q?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc';
  limit?: number;
  offset?: number;
}

interface SearchRow extends CardRow {
  brand_slug: string | null; brand_name: string | null; brand_name_ar: string | null;
  seller_type: string;
  vehicle_category: string;
}

const SEARCH_SELECT = `SELECT u.id, u.slug, u.title, u.title_ar, u.unit_kind, u.status, u.vehicle_category,
    u.year, u.mileage_km, u.price_egp, u.price_currency, u.negotiable,
    s.slug AS seller_slug, s.name AS seller_name, s.name_ar AS seller_name_ar,
    s.type_id AS seller_type,
    m.slug AS model_slug,
    br.slug AS brand_slug, br.name AS brand_name, br.name_ar AS brand_name_ar
  FROM units u
  JOIN businesses s ON s.id = u.seller_business_id
  LEFT JOIN businesses m ON m.id = u.model_business_id
  LEFT JOIN businesses br ON br.id = m.parent_business_id`;

function buildWhere(opts: SearchOpts): { sql: string; params: unknown[] } {
  const w: string[] = ['u.published = 1', "u.status <> 'inactive'"];
  const p: unknown[] = [];
  if (opts.brand)   { w.push('br.slug = ?'); p.push(opts.brand); }
  if (opts.model)   { w.push('m.slug = ?');  p.push(opts.model); }
  if (opts.seller)  { w.push('s.slug = ?');  p.push(opts.seller); }
  if (opts.kind)    { w.push('u.unit_kind = ?'); p.push(opts.kind); }
  if (opts.category) { w.push('u.vehicle_category = ?'); p.push(opts.category); }
  if (opts.sellerType) { w.push('s.type_id = ?'); p.push(opts.sellerType); }
  if (opts.yearFrom)   { w.push('u.year >= ?'); p.push(opts.yearFrom); }
  if (opts.yearTo)     { w.push('u.year <= ?'); p.push(opts.yearTo); }
  if (opts.priceFrom)  { w.push('u.price_egp >= ?'); p.push(opts.priceFrom); }
  if (opts.priceTo)    { w.push('u.price_egp <= ?'); p.push(opts.priceTo); }
  if (opts.mileageMax) { w.push('(u.mileage_km IS NULL OR u.mileage_km <= ?)'); p.push(opts.mileageMax); }
  if (opts.q) {
    const like = `%${opts.q.trim().toLowerCase()}%`;
    w.push(`(LOWER(u.title) LIKE ? OR LOWER(COALESCE(u.title_ar,'')) LIKE ?
            OR LOWER(s.name) LIKE ? OR LOWER(COALESCE(s.name_ar,'')) LIKE ?)`);
    p.push(like, like, like, like);
  }
  return { sql: `WHERE ${w.join(' AND ')}`, params: p };
}

function buildOrder(sort: SearchOpts['sort']): string {
  switch (sort) {
    case 'price_asc':   return '(u.price_egp IS NULL), u.price_egp ASC';
    case 'price_desc':  return 'u.price_egp DESC';
    case 'year_desc':   return '(u.year IS NULL), u.year DESC';
    case 'mileage_asc': return '(u.mileage_km IS NULL), u.mileage_km ASC';
    default:            return 'u.updated_at DESC';
  }
}

/** A catalog card: the strip card plus the brand/seller-type context a browser needs. */
export interface CatalogCard extends UnitCard {
  brandSlug: string | null;
  brandName: string | null;
  sellerType: string;
  vehicleCategory: string;
}

async function toCatalogCards(rows: SearchRow[], locale: SiteLocale): Promise<CatalogCard[]> {
  const ar = locale === 'ar';
  const photos = await heroPhotos(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: ar ? (r.title_ar?.trim() || 'مركبة') : r.title,
    unitKind: r.unit_kind,
    status: r.status,
    year: r.year,
    mileageKm: r.mileage_km,
    priceEgp: r.price_egp,
    currency: r.price_currency,
    negotiable: r.negotiable === 1,
    sellerSlug: r.seller_slug,
    sellerName: locale === 'ar' ? (r.seller_name_ar?.trim() || 'المعرض') : r.seller_name,
    modelSlug: r.model_slug,
    imageUrl: photos.get(r.id) ?? null,
    href: unitPath(locale, r.seller_slug, r.slug),
    brandSlug: r.brand_slug,
    brandName: locale === 'ar' ? r.brand_name_ar?.trim() || null : r.brand_name,
    sellerType: r.seller_type,
    vehicleCategory: r.vehicle_category,
  }));
}

/** Search the public catalog. Cards + total count so a page can paginate. */
export async function searchUnits(opts: SearchOpts): Promise<{ cards: CatalogCard[]; total: number }> {
  const { sql, params } = buildWhere(opts);
  const order = buildOrder(opts.sort);
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;
  const [rows, count] = await Promise.all([
    query<SearchRow>(
      `${SEARCH_SELECT} ${sql} ORDER BY ${order}, u.title LIMIT ${Math.trunc(limit)} OFFSET ${Math.trunc(offset)}`,
      params,
    ),
    queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n
         FROM units u
         JOIN businesses s ON s.id = u.seller_business_id
         LEFT JOIN businesses m ON m.id = u.model_business_id
         LEFT JOIN businesses br ON br.id = m.parent_business_id
         ${sql}`,
      params,
    ),
  ]);
  return { cards: await toCatalogCards(rows, opts.locale), total: count?.n ?? 0 };
}

/**
 * Facet values for the /cars filter UI. Only facets that actually exist on
 * published units appear; a brand with zero live stock does not tempt the
 * visitor into an empty page.
 */
export interface Facets {
  brands: { slug: string; name: string }[];
  kinds: string[];
  categories: string[];
  sellerTypes: string[];
  yearMin: number | null;
  yearMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
}

export async function catalogFacets(locale: SiteLocale): Promise<Facets> {
  const ar = locale === 'ar';
  const [brands, kinds, categories, sellerTypes, bounds] = await Promise.all([
    query<{ slug: string; name: string; name_ar: string | null }>(
      `SELECT DISTINCT br.slug, br.name, br.name_ar
         FROM units u
         JOIN businesses m ON m.id = u.model_business_id
         JOIN businesses br ON br.id = m.parent_business_id
        WHERE u.published = 1 AND u.status <> 'inactive'
        ORDER BY COALESCE(br.name_ar, br.name)`,
    ),
    query<{ v: string }>(`SELECT DISTINCT unit_kind AS v FROM units WHERE published = 1 AND status <> 'inactive'`),
    query<{ v: string }>(`SELECT DISTINCT vehicle_category AS v FROM units WHERE published = 1 AND status <> 'inactive'`),
    query<{ v: string }>(
      `SELECT DISTINCT s.type_id AS v FROM units u JOIN businesses s ON s.id = u.seller_business_id
        WHERE u.published = 1 AND u.status <> 'inactive'`,
    ),
    queryOne<{ ymin: number | null; ymax: number | null; pmin: number | null; pmax: number | null }>(
      `SELECT MIN(year) AS ymin, MAX(year) AS ymax, MIN(price_egp) AS pmin, MAX(price_egp) AS pmax
         FROM units WHERE published = 1 AND status <> 'inactive'`,
    ),
  ]);
  return {
    brands: brands.map((b) => ({ slug: b.slug, name: ar ? (b.name_ar?.trim() || 'علامة تجارية') : b.name })),
    kinds: kinds.map((k) => k.v).filter(Boolean),
    categories: categories.map((k) => k.v).filter(Boolean),
    sellerTypes: sellerTypes.map((k) => k.v).filter(Boolean),
    yearMin: bounds?.ymin ?? null,
    yearMax: bounds?.ymax ?? null,
    priceMin: bounds?.pmin ?? null,
    priceMax: bounds?.pmax ?? null,
  };
}

/** The public A→Z brand directory. Only brands with at least one live unit. */
export async function listBrands(locale: SiteLocale): Promise<{ slug: string; name: string; nameEn: string; count: number }[]> {
  const ar = locale === 'ar';
  const rows = await query<{ slug: string; name: string; name_ar: string | null; n: number }>(
    `SELECT br.slug, br.name, br.name_ar, COUNT(u.id) AS n
       FROM businesses br
       JOIN businesses m ON m.parent_business_id = br.id AND m.type_id = ?
       JOIN units u ON u.model_business_id = m.id
      WHERE br.type_id = 'vehicle_brand' AND br.published = 1 AND br.status = 'active'
        AND u.published = 1 AND u.status <> 'inactive'
      GROUP BY br.id
      ORDER BY COALESCE(br.name_ar, br.name)`,
    [SPEC_TYPE],
  );
  return rows.map((r) => ({
    slug: r.slug,
    name: ar ? (r.name_ar?.trim() || 'علامة تجارية') : r.name,
    nameEn: r.name,
    nameAr: r.name_ar,
    count: r.n,
  }));
}

// ── offers: the model-level "starting from" ────────────────────────────────────
export interface PublicOffer {
  id: string;
  authority: string;
  sellerName: string;
  sellerNameAr: string | null;
  sellerSlug: string;
  trim: string;
  unitKind: string;
  priceFromEgp: number | null;
  priceToEgp: number | null;
  note: string | null;
  noteAr: string | null;
  updatedAt: string;
}

/**
 * Published offers for one model, ordered by authority rank so the agency list
 * reads first. This is what a model page and a unit page display side by side
 * with live asking prices.
 */
export async function listOffersForModel(modelBusinessId: string): Promise<PublicOffer[]> {
  const rows = await query<{
    id: string; authority: string; seller_name: string; seller_name_ar: string | null;
    seller_slug: string; trim: string; unit_kind: string;
    price_from_egp: number | null; price_to_egp: number | null;
    availability_note: string | null; availability_note_ar: string | null; updated_at: string;
  }>(
    `SELECT o.id, o.authority, o.trim, o.unit_kind, o.price_from_egp, o.price_to_egp,
            o.availability_note, o.availability_note_ar, o.updated_at,
            s.name AS seller_name, s.name_ar AS seller_name_ar, s.slug AS seller_slug
       FROM unit_offers o
       JOIN businesses s ON s.id = o.seller_business_id
      WHERE o.model_business_id = ? AND o.published = 1
      ORDER BY CASE o.authority
        WHEN 'agency_official' THEN 0
        WHEN 'distributor' THEN 1
        WHEN 'dealer' THEN 2
        ELSE 3 END, o.price_from_egp ASC NULLS LAST`,
    [modelBusinessId],
  );
  return rows.map((r) => ({
    id: r.id, authority: r.authority, sellerName: r.seller_name, sellerNameAr: r.seller_name_ar,
    sellerSlug: r.seller_slug, trim: r.trim, unitKind: r.unit_kind,
    priceFromEgp: r.price_from_egp, priceToEgp: r.price_to_egp,
    note: r.availability_note, noteAr: r.availability_note_ar, updatedAt: r.updated_at,
  }));
}

/** All offers a seller has published across every model. For the admin screen. */
export async function listOffersBySeller(sellerBusinessId: string): Promise<({
  id: string; model_name: string; model_name_ar: string | null; model_slug: string;
  authority: string; trim: string; unit_kind: string;
  price_from_egp: number | null; price_to_egp: number | null; published: number; updated_at: string;
})[]> {
  return query(
    `SELECT o.id, o.authority, o.trim, o.unit_kind, o.price_from_egp, o.price_to_egp,
            o.published, o.updated_at,
            m.name AS model_name, m.name_ar AS model_name_ar, m.slug AS model_slug
       FROM unit_offers o
       JOIN businesses m ON m.id = o.model_business_id
      WHERE o.seller_business_id = ?
      ORDER BY o.published DESC, o.updated_at DESC`,
    [sellerBusinessId],
  );
}
