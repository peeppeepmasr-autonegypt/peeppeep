/**
 * The vocabulary of a unit, with no database behind it.
 *
 * Ported from siwa-oasis `src/lib/unit-terms.ts`. The real-estate file splits
 * writes (`units-admin.ts`) from this vocabulary precisely so a form and a public
 * card can share the same words without pulling a database driver into the
 * browser bundle — the same reason it is a separate file here.
 *
 * Only the domain know-how changed: a unit is a car, so the kinds are condition
 * rather than rent-vs-sale, and the columns a declared field must never
 * redeclare are price, year, mileage, VIN and colour.
 */

/** Condition of the car, not a market: "Certified Pre-Owned" is a used car with a guarantee. */
export const UNIT_KINDS = ['new', 'used', 'demo', 'lease_return'] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

export const VEHICLE_CATEGORIES = ['car', 'motorcycle', 'scooter', 'commercial'] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const UNIT_STATUSES = ['available', 'reserved', 'sold', 'rented', 'inactive'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

/** Whose stock it is. The broker case is the reason this is not a boolean. */
export const STOCK_SOURCES = ['own_stock', 'on_behalf_of', 'consignment'] as const;
export type StockSource = (typeof STOCK_SOURCES)[number];

/**
 * Authority over a price, ranked. Ported from the reference's
 * `price_snapshots.source_type`, and it exists because "a verified developer
 * price list and a stale portal listing currently look identical".
 */
export const PRICE_SOURCES = [
  'agency_price_list',
  'dealer_listing',
  'broker_listing',
  'portal',
  'news',
  'bank_valuation',
] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

/** Lower index = closer to the party that sets the number. */
const PRICE_SOURCE_RANK: Record<PriceSource, number> = {
  agency_price_list: 0,
  dealer_listing: 1,
  broker_listing: 2,
  portal: 3,
  news: 4,
  bank_valuation: 5,
};

export function isPriceSource(value: unknown): value is PriceSource {
  return (PRICE_SOURCES as readonly string[]).includes(String(value ?? '').trim());
}

export function priceSourceRank(value: unknown): number {
  return isPriceSource(value) ? PRICE_SOURCE_RANK[value] : PRICE_SOURCES.length;
}

const PRICE_SOURCE_LABEL: Record<PriceSource, { en: string; ar: string }> = {
  agency_price_list: { en: 'Official agency price list', ar: 'قائمة سعر الوكيل الرسمي' },
  dealer_listing: { en: 'Dealer asking price', ar: 'سعر المعرض' },
  broker_listing: { en: 'Broker asking price', ar: 'سعر الوسيط' },
  portal: { en: 'Portal listing', ar: 'إعلان على منصة' },
  news: { en: 'Reported in news', ar: 'منشور في الأخبار' },
  bank_valuation: { en: 'Bank valuation', ar: 'تقييم بنكي' },
};

/** Says who stated the number. A bare price on a car page is an unclaimed price. */
export function priceSourceLabel(value: unknown, ar: boolean): string | null {
  if (!isPriceSource(value)) return null;
  return PRICE_SOURCE_LABEL[value][ar ? 'ar' : 'en'];
}

/**
 * Offer terms that belong on `units` and nowhere else.
 *
 * A field declared over one of these names would create a second answer to the
 * same question, and the two would drift the first time a price changed. This is
 * the guard that keeps `sec_auto_specs.power_hp` and
 * `sec_auto_engine.max_power_hp` from ever being written again — the exact
 * duplication migration 0008 had to undo by hand.
 */
export const UNIT_TERM_COLUMNS = [
  'unit_kind', 'status', 'stock_source', 'year', 'mileage_km', 'vin', 'color', 'color_ar',
  'price_egp', 'price_currency', 'negotiable', 'title', 'title_ar', 'slug', 'published',
] as const;

/** The names a vendor would plausibly type, including their synonyms. */
const UNIT_TERM_ALIASES = new Map<string, string>([
  ...UNIT_TERM_COLUMNS.map((c) => [c, c] as [string, string]),
  // Price asked with other words. `price_plan` is deliberately absent: the words
  // about a payment plan are prose, the numbers of one live on the unit.
  ['price', 'price_egp'], ['total_price', 'price_egp'], ['cost', 'price_egp'],
  ['cash_price', 'price_egp'], ['asking_price', 'price_egp'], ['value_egp', 'price_egp'],
  ['currency', 'price_currency'], ['egp', 'price_egp'],
  // Year
  ['model_year', 'year'], ['fab_year', 'year'], ['manufacture_year', 'year'], ['year_of_make', 'year'],
  // Mileage
  ['mileage', 'mileage_km'], ['km', 'mileage_km'], ['odometer', 'mileage_km'],
  ['distance_covered', 'mileage_km'], ['km_driven', 'mileage_km'], ['usage_km', 'mileage_km'],
  // VIN
  ['chassis_no', 'vin'], ['chassis_number', 'vin'], ['vin_no', 'vin'], ['serial_no', 'vin'], ['frame_no', 'vin'],
  // Colour
  ['colour', 'color'], ['exterior_color', 'color'], ['paint_color', 'color'],
  // Condition — the same question `unit_kind` answers.
  ['condition', 'unit_kind'], ['state', 'unit_kind'], ['car_state', 'unit_kind'],
  ['certified_pre_owned', 'unit_kind'], ['new_or_used', 'unit_kind'],
  // Negotiation
  ['is_negotiable', 'negotiable'], ['price_negotiable', 'negotiable'], ['bargaining', 'negotiable'],
  ['on_offer', 'status'], ['availability', 'status'], ['sold', 'status'],
]);

/**
 * Does this proposed field name collide with a real column?
 *
 * Compared on the flattened form, so `mileageKm`, `mileage_km` and `MILEAGE KM`
 * all hit the same guard. Returns the column it collides with, so the field
 * editor can point at the inventory screen instead of just refusing.
 */
export function collidesWithUnitTerm(name: unknown): string | null {
  const raw = String(name ?? '').trim();
  if (!raw) return null;
  const flattened = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!flattened) return null;
  if (UNIT_TERM_ALIASES.has(flattened)) return UNIT_TERM_ALIASES.get(flattened)!;
  // "How many kilometres has it done", asked in the order a vendor types it.
  if (/^(how_many_)?km(_?done|_?covered|_?driven)?$/.test(flattened)) return 'mileage_km';
  if (/^(num|no|number)_of_(km|kilometres|kilometers)$/.test(flattened)) return 'mileage_km';
  if (/^(car|vehicle)_condition$/.test(flattened)) return 'unit_kind';
  if (/^price_(egp|in_egp)$/.test(flattened)) return 'price_egp';
  return null;
}

// ── the words a page prints ──────────────────────────────────────────────────
//
// The enum values are storage; these are what a buyer reads. They live here
// rather than in a component because the unit page, the vendor dashboard, the
// availability shelf and the search facets all print the same three words, and
// Arabic typed four times is Arabic misspelled four times.

const UNIT_KIND_LABEL: Record<UnitKind, { en: string; ar: string }> = {
  new: { en: 'New', ar: 'جديدة' },
  used: { en: 'Used', ar: 'مستعملة' },
  demo: { en: 'Demo', ar: 'سيارة عرض' },
  lease_return: { en: 'Lease return', ar: 'مرتجعة من التأجير التمويلي' },
};

const VEHICLE_CATEGORY_LABEL: Record<VehicleCategory, { en: string; ar: string }> = {
  car: { en: 'Car', ar: 'سيارة' },
  motorcycle: { en: 'Motorcycle', ar: 'دراجة نارية' },
  scooter: { en: 'Scooter', ar: 'سكوتر' },
  commercial: { en: 'Commercial vehicle', ar: 'مركبة تجارية' },
};

export function vehicleCategoryLabel(value: unknown, ar: boolean): string {
  const key = String(value ?? '');
  return key in VEHICLE_CATEGORY_LABEL
    ? VEHICLE_CATEGORY_LABEL[key as VehicleCategory][ar ? 'ar' : 'en']
    : key;
}

const UNIT_STATUS_LABEL: Record<UnitStatus, { en: string; ar: string }> = {
  available: { en: 'Available', ar: 'متاحة' },
  reserved: { en: 'Reserved', ar: 'محجوزة' },
  sold: { en: 'Sold', ar: 'بيعت' },
  rented: { en: 'Rented', ar: 'مؤجرة' },
  inactive: { en: 'Not listed', ar: 'غير معلنة' },
};

const STOCK_SOURCE_LABEL: Record<StockSource, { en: string; ar: string }> = {
  own_stock: { en: "The showroom's own stock", ar: 'رصيد المعرض' },
  on_behalf_of: { en: 'Sold on behalf of the owner', ar: 'للبيع لحساب المالك' },
  consignment: { en: 'Consignment', ar: 'أمانة للبيع' },
};

/** Falls back to the stored text, because a value outside the enum is a data bug to see, not to hide. */
function termLabel(map: Record<string, { en: string; ar: string }>, value: unknown, ar: boolean): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return (map[text] ?? { en: text, ar: text })[ar ? 'ar' : 'en'];
}

export const unitKindLabel = (v: unknown, ar: boolean) => termLabel(UNIT_KIND_LABEL, v, ar);
export const unitStatusLabel = (v: unknown, ar: boolean) => termLabel(UNIT_STATUS_LABEL, v, ar);
export const stockSourceLabel = (v: unknown, ar: boolean) => termLabel(STOCK_SOURCE_LABEL, v, ar);

/** The kinds whose buyer expects a mileage figure, whatever the seller ticked. */
export const MILEAGE_BEARING_KINDS: UnitKind[] = ['used', 'demo', 'lease_return'];
