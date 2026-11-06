/**
 * kind-pages — the machine-readable contract that says where a kind lives.
 *
 * `resolveSections` answers "what shelves does this kind render". This answers
 * the other half: "at what URL, and via which read function". Without it the
 * typology is only half-settled: an admin can create a kind the guards approve
 * and no route will ever print it, which is the same invisible-data failure
 * `assertSectionCarried` refuses for a field on the wrong shelf.
 *
 * Three shapes:
 *   - `minisite`  — a businesses node rendered by loadMinisite(slug, locale)
 *                   under /[slug] (AR) and /en/[slug] (EN).
 *   - `unit`      — a units row rendered under /[sellerSlug]/u/[unitSlug].
 *                   Not yet built; the registry names it so the guard knows
 *                   where the destination is when b5 lands.
 *   - `none`      — the kind is a template, a retired row, or reference data
 *                   that never owns a page. The route layer refuses to
 *                   instantiate.
 *
 * Add a leaf kind through the admin without touching this file? The default
 * rule at the bottom says: an unlisted leaf with `vendor_claimable = 1` is
 * assumed to be a minisite, because that is what the sales/finance/aftermarket
 * chain does; everything else is treated as `none` and the settled checklist
 * (c4) flags it. Being explicit beats being silently broken.
 */
import { queryOne } from '@/lib/db';
import { RETIRED_NODE_TYPE } from '@/lib/typology';

export type PageShape = 'minisite' | 'unit' | 'none';

export interface KindPage {
  shape: PageShape;
  /** Path template in the app router, e.g. '(ar)/[slug]/page.tsx'. */
  route: string;
  /** Read function name from src/lib, for the settled checklist to point at. */
  readFn: string;
  /** Notes shown when the shape is 'none' or pending. */
  reason?: string;
}

// Parent kinds and reference kinds: no page.
const PARENT_KINDS = ['auto_vehicles', 'auto_sales', 'auto_finance', 'auto_aftermarket'] as const;

/**
 * Every leaf kind that renders as a businesses minisite.
 *
 * The URL is always /[slug] in AR and /en/[slug] in EN; only the read function
 * varies, and today they all use `loadMinisite`. Naming the read function
 * explicitly is the point — when a kind needs a bespoke loader (say, a factory
 * that renders origin_chain instead of inventory), it gets its own entry here
 * and c4's checklist proves which kinds are still on the generic path.
 */
const MINISITE_KINDS: Record<string, KindPage> = {
  vehicle_brand:   { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  vehicle_model:   { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  vehicle_trim:    { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  factory:         { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  main_agency:     { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  showroom:        { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  distributor:     { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  agent_broker:    { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  used_car_dealer: { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  finance_bank:    { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  leasing_company: { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  insurance_company: { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  spare_parts:     { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  service_center:  { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
  accessories_detailing: { shape: 'minisite', route: '(ar)/[slug]/page.tsx', readFn: 'loadMinisite' },
};

/**
 * The unit is the exception: it is a row, not a node, so its slug is unique
 * across the market and its URL nests under the seller. b5 will build the
 * route; the registry names it now so the settled checklist reports the truth.
 */
const UNIT_PAGE: KindPage = {
  shape: 'unit',
  route: '(ar)/[seller]/u/[unit]/page.tsx',
  readFn: 'loadUnit',
  reason: 'The unit page is built by S3 in the plan; until then a unit renders through its seller.',
};

/** Retired kinds with their redirect target, not a fresh 200. */
const RETIRED: Record<string, KindPage> = {
  [RETIRED_NODE_TYPE]: {
    shape: 'none',
    route: '',
    readFn: '',
    reason: 'car_listing was retired by 0009. The old bare path 301s to /[seller]/u/[unit].',
  },
};

/**
 * Look up a kind's page contract.
 *
 * Falls back to a minisite for an unlisted leaf the vendor can claim (that is
 * what a new seller kind is by default), and to `none` for anything else, so
 * the admin can add a kind without editing this file and the checklist will
 * still tell them it has no explicit page contract yet.
 */
export async function kindPageFor(typeId: string): Promise<KindPage> {
  if (RETIRED[typeId]) return RETIRED[typeId];
  if ((PARENT_KINDS as readonly string[]).includes(typeId)) {
    return { shape: 'none', route: '', readFn: '', reason: 'Parent kind: a template, never a page.' };
  }
  if (MINISITE_KINDS[typeId]) return MINISITE_KINDS[typeId];
  const rule = await queryOne<{ is_parent: number; vendor_claimable: number }>(
    'SELECT is_parent, vendor_claimable FROM business_types WHERE id = ?',
    [typeId],
  );
  if (!rule) return { shape: 'none', route: '', readFn: '', reason: 'Unknown kind.' };
  if (rule.is_parent) return { shape: 'none', route: '', readFn: '', reason: 'Parent kind.' };
  if (rule.vendor_claimable) return MINISITE_KINDS.showroom; // generic minisite fallback
  return { shape: 'none', route: '', readFn: '', reason: 'Reference kind with no registered page.' };
}

/**
 * The unit-side lookup. Not derived from `business_types` because a unit is not
 * a kind: it is a row whose shape is fixed by migration 0008.
 */
export function unitPage(): KindPage {
  return UNIT_PAGE;
}

/** For the settled checklist: every kind this file knows about, with its page. */
export function knownKindPages(): Record<string, KindPage> {
  return { ...MINISITE_KINDS, ...RETIRED };
}
