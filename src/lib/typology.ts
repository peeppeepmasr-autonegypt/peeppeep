/**
 * The typology contract: who may exist, under whom, and who may state a price.
 *
 * Ported from siwa-oasis `src/lib/business-hierarchy.ts` — the rules, not the
 * emoji badge layer. Two differences matter:
 *
 *  1. The rules are read from the columns migration 0008 added
 *     (`is_parent`, `vendor_claimable`, `allowed_child_kinds`), so the typology
 *     stays data the admin can see rather than a list remembered in code.
 *  2. A car is not a business, so the guards a marketplace needs most are about
 *     authority over a NUMBER, not about who owns a PAGE: `assertSellable`,
 *     `assertOfferAuthority` and `assertUnitOverrideKey` have no counterpart in
 *     the file they were read from.
 *
 * Everything here throws `TypologyError` with a sentence a vendor can act on. A
 * guard that only says "not allowed" teaches nobody what the system believes.
 */
import { query, queryOne } from '@/lib/db';
import { resolveSections } from '@/lib/minisite';
import { SITE_LOCALES } from '@/lib/site-locale';
import { RELATION_TYPES } from '@/lib/topology';
import { collidesWithUnitTerm, UNIT_TERM_COLUMNS } from '@/lib/unit-terms';

/**
 * The kind that owns a car's specification questions.
 *
 * A unit's facts are always defined by `vehicle_model`, even when the car has no
 * registered model node and its page is hosted by the showroom: definitions come
 * from the KIND, values come from whichever record actually holds them. Coupling
 * the two would either fabricate a model page for an unregistered car or leave the
 * car holding authored answers with no label to print them under -- the exact
 * failure `fieldTypePriority` was written to prevent.
 */
export const SPEC_TYPE = 'vehicle_model';
/** Retired by migration 0009: a car is a `units` row, never a node. */
export const RETIRED_NODE_TYPE = 'car_listing';

export class TypologyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypologyError';
  }
}

export interface TypeRule {
  id: string;
  name: string;
  is_parent: number;
  vendor_claimable: number;
  allowed_child_kinds: string[];
}

export async function loadTypeRule(typeId: string): Promise<TypeRule | null> {
  const row = await queryOne<{
    id: string; name: string; is_parent: number; vendor_claimable: number;
    allowed_child_kinds: string | null;
  }>(
    `SELECT id, name, is_parent, vendor_claimable, allowed_child_kinds
       FROM business_types WHERE id = ?`,
    [typeId],
  );
  if (!row) return null;
  let allowed: string[] = [];
  try { allowed = JSON.parse(row.allowed_child_kinds ?? '[]') as string[]; } catch { allowed = []; }
  return {
    id: row.id, name: row.name, is_parent: row.is_parent,
    vendor_claimable: row.vendor_claimable, allowed_child_kinds: allowed,
  };
}

// ── who may be created under whom ─────────────────────────────────────────────
/**
 * Nesting is a relationship between KINDS, and the tree only holds kinds the
 * market recognises. A showroom may hold no children at all: everything it owns
 * is a unit, and a unit is a row.
 */
export async function assertNesting(parentTypeId: string, childTypeId: string): Promise<void> {
  const parent = await loadTypeRule(parentTypeId);
  if (!parent) throw new TypologyError(`Unknown parent kind "${parentTypeId}".`);
  if (childTypeId === RETIRED_NODE_TYPE) {
    throw new TypologyError(
      'A car is no longer a page under a showroom. Add it as a unit on the Units screen — '
      + 'it will get its own address, its own photographs and its own price history.',
    );
  }
  if (!parent.allowed_child_kinds.includes(childTypeId)) {
    const list = parent.allowed_child_kinds.length ? parent.allowed_child_kinds.join(', ') : 'nothing';
    throw new TypologyError(
      `A ${parent.name} may contain ${list}. It cannot contain a "${childTypeId}".`,
    );
  }
}

/**
 * Instantiability, which is not the same question as claimability.
 *
 * `vehicle_model` is reference data the platform owns and a vendor may not claim
 * — that is what stops every dealer from creating its own copy of the X5. A
 * platform admin creating taxonomy is the same kind being instantiated by the
 * party that owns it, so the actor's role decides, not the kind.
 */
export async function assertInstantiable(
  typeId: string,
  opts: { actorRole?: string | null } = {},
): Promise<TypeRule> {
  const rule = await loadTypeRule(typeId);
  if (!rule) throw new TypologyError(`Unknown business type "${typeId}".`);
  if (typeId === RETIRED_NODE_TYPE) {
    throw new TypologyError('Car listings are units now. Create the unit, not the node.');
  }
  const isAdmin = opts.actorRole === 'platform_admin';
  if (!isAdmin && rule.vendor_claimable !== 1) {
    throw new TypologyError(
      `A "${rule.name}" is platform reference data, not a page a vendor claims. `
      + 'Ask the platform team to add it, then link your stock to it.',
    );
  }
  return rule;
}

// ── who may put a car on the market ───────────────────────────────────────────
/**
 * The types that may hold stock. The factory is deliberately absent: a plant is
 * provenance, not a seller. It reaches the car through `manufactured_at`, and
 * giving it units would put a manufacturer in the price comparison of its own
 * dealers — which is the conflict the whole authority ranking exists to avoid.
 */
export const SELLABLE_TYPES = [
  'main_agency', 'distributor', 'showroom', 'agent_broker', 'used_car_dealer',
] as const;
export type SellableType = (typeof SELLABLE_TYPES)[number];

export function isSellableType(typeId: unknown): boolean {
  return (SELLABLE_TYPES as readonly string[]).includes(String(typeId));
}

/** A unit's seller must be a live, claimable, selling business. */
export async function assertSellable(sellerBusinessId: string): Promise<{ id: string; type_id: string; name: string }> {
  const row = await queryOne<{ id: string; type_id: string; name: string; published: number; status: string }>(
    'SELECT id, type_id, name, published, status FROM businesses WHERE id = ?',
    [sellerBusinessId],
  );
  if (!row) throw new TypologyError('The seller of this unit does not exist.');
  if (!isSellableType(row.type_id)) {
    throw new TypologyError(
      `A "${row.type_id}" cannot list a car for sale. `
      + 'Only an agency, distributor, showroom, dealer or broker may own stock.',
    );
  }
  if (row.status !== 'active' || row.published !== 1) {
    throw new TypologyError(`"${row.name}" is not published, so nothing can be sold through it.`);
  }
  return { id: row.id, type_id: row.type_id, name: row.name };
}

// ── who may say what a thing costs ────────────────────────────────────────────
/**
 * Authority over an offer is a property of the SELLER'S KIND, not of its
 * confidence. An agency's list and a broker's ask are different claims about the
 * market, and the ranking is what lets a page show both without pretending they
 * are the same number.
 */
export const OFFER_AUTHORITIES = ['agency_official', 'distributor', 'dealer', 'broker'] as const;
export type OfferAuthority = (typeof OFFER_AUTHORITIES)[number];

const AUTHORITY_OF_TYPE: Record<string, OfferAuthority[]> = {
  main_agency: ['agency_official', 'distributor', 'dealer'],
  distributor: ['distributor', 'dealer'],
  showroom: ['dealer'],
  used_car_dealer: ['dealer'],
  agent_broker: ['broker'],
};

/**
 * Can this seller publish an offer with this authority?
 *
 * The database already refuses a second official list per model
 * (`uq_offers_official`); this refuses the claim before the insert, so the vendor
 * is told which sentence they are not entitled to say.
 */
export async function assertOfferAuthority(
  sellerBusinessId: string,
  authority: string,
): Promise<void> {
  if (!(OFFER_AUTHORITIES as readonly string[]).includes(authority)) {
    throw new TypologyError(`Unknown offer authority "${authority}".`);
  }
  const seller = await assertSellable(sellerBusinessId);
  const allowed = AUTHORITY_OF_TYPE[seller.type_id] ?? [];
  if (!allowed.includes(authority as OfferAuthority)) {
    const named = allowed.length ? allowed.join(', ') : 'no offer authority at all';
    throw new TypologyError(
      `A ${seller.type_id} may publish ${named}. "${authority}" belongs to someone `
      + 'higher in the chain than you are.',
    );
  }
}

/**
 * A market is a namespace, not a label.
 *
 * Kinds, shelves and slugs all live inside one, and every price in the database is
 * a bare INTEGER in the market's currency — so a currency written as `egp` or
 * `Egp` does not fail, it silently misscales everything the site quotes.
 */
export function assertMarketDefinition(input: {
  id: string;
  slug?: string | null;
  currency?: string | null;
  default_locale?: string | null;
}): void {
  const slug = String(input.slug ?? input.id ?? '').trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new TypologyError(
      `Market slug "${slug}" must be lowercase letters, digits and dashes. It names a namespace that other rows point at.`,
    );
  }
  if (input.currency && !/^[A-Z]{3}$/.test(input.currency)) {
    throw new TypologyError(
      `Currency "${input.currency}" is not a 3-letter uppercase code. Prices are stored as plain integers in the market currency, so a loose code cannot be detected later.`,
    );
  }
  if (input.default_locale && !(SITE_LOCALES as readonly string[]).includes(String(input.default_locale))) {
    throw new TypologyError(
      `"${input.default_locale}" is not a locale this site renders. Supported: ${SITE_LOCALES.join(', ')}.`,
    );
  }
}

// ── the shelf contract: authored, relational, or both ────────────────────────
/** How a shelf obtains its content. Mirrors the `sections.content_kind` CHECK. */
export type ContentKind = 'authored' | 'relational' | 'mixed';
export const CONTENT_KINDS: readonly ContentKind[] = ['authored', 'relational', 'mixed'];

export interface ShelfRow {
  id: string;
  name: string;
  content_kind: ContentKind;
  options: string | null;
}

export async function loadShelf(sectionId: string): Promise<ShelfRow | null> {
  return queryOne<ShelfRow>(
    'SELECT id, name, content_kind, options FROM sections WHERE id = ?',
    [sectionId],
  );
}

/** The tree is a legal "relation" alongside the graph's typed edges. */
const TREE_RELATION = 'children';

/**
 * May a definition be written onto this shelf at all?
 *
 * A relational shelf is answered by a query over the graph. Typing an answer into
 * it does not fail: the value is stored, the query wins, and the author keeps
 * editing a field that prints nowhere. That is the 0006 defect in its pure form —
 * two places stating one fact, and only one of them read.
 */
export async function assertShelfAcceptsFields(sectionId: string): Promise<void> {
  const shelf = await loadShelf(sectionId);
  if (!shelf) throw new TypologyError(`Unknown shelf "${sectionId}".`);
  if (shelf.content_kind === 'relational') {
    throw new TypologyError(
      `"${shelf.name}" is answered by a query, not by typing. A definition here would be `
      + 'stored and then beaten by the query. Create the edge instead — or, if the shelf '
      + 'genuinely carries its own notes beside the query, mark it mixed.',
    );
  }
}

/** Parses `relationship` out of a shelf's options without trusting either shape. */
function relationshipSpecs(options: string | null): Array<Record<string, unknown>> {
  if (!options) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(options); } catch { return []; }
  const list = (parsed as { relationship?: unknown })?.relationship;
  return Array.isArray(list) ? list.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object') : [];
}

/**
 * Is the shelf's own declaration coherent with what it claims to be?
 *
 * Called with the PROSPECTIVE row, because a PATCH that changes only
 * `content_kind` still has to agree with the options already stored — validating
 * the delta alone would let a demotion through the door unhindered.
 */
export function assertShelfShape(shelf: { id: string; name?: string; content_kind: string; options: string | null }): void {
  const named = shelf.name ?? shelf.id;
  const kind = shelf.content_kind as ContentKind;
  if (!CONTENT_KINDS.includes(kind)) {
    throw new TypologyError(
      `content_kind must be one of ${CONTENT_KINDS.join(', ')}, not "${String(shelf.content_kind)}".`,
    );
  }
  const specs = relationshipSpecs(shelf.options);
  for (const spec of specs) {
    const relation = String(spec.relation ?? '');
    if (relation !== TREE_RELATION && !RELATION_TYPES[relation]) {
      throw new TypologyError(
        `"${named}" asks for the relation "${relation || '(none)'}", which the graph does not `
        + `know. Allowed: ${TREE_RELATION}, ${Object.keys(RELATION_TYPES).join(', ')}. `
        + 'An unknown key renders an empty shelf and looks exactly like having no data.',
      );
    }
  }
  if (kind !== 'authored' && !specs.length) {
    throw new TypologyError(
      `A ${kind} shelf must declare what it queries. "${named}" declares no relationship, `
      + 'so half of it would render as an empty heading.',
    );
  }
  if (kind === 'authored' && specs.length) {
    throw new TypologyError(
      `"${named}" queries the graph, so it is mixed (a query plus typed answers) or relational (query only) — not authored.`,
    );
  }
}

/** Every shelf id a kind lists has to exist, or the kind carries an invisible drawer. */
export async function assertShelvesExist(ref: unknown, label: string): Promise<void> {
  const ids = parseIdList(ref);
  if (!ids.length) return;
  const rows = await query<{ id: string }>(
    `SELECT id FROM sections WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
  const known = new Set(rows.map((r) => r.id));
  const ghosts = ids.filter((id) => !known.has(id));
  if (ghosts.length) {
    throw new TypologyError(
      `${label} names shelves that do not exist: ${ghosts.join(', ')}. They would be assigned to the kind, rendered nowhere, and blamed on the data.`,
    );
  }
}

/** A JSON array or an array of ids, forgiving about the shape the client sends. */
function parseIdList(ref: unknown): string[] {
  if (Array.isArray(ref)) return ref.map(String).filter(Boolean);
  if (typeof ref === 'string' && ref.trim()) {
    try { const p = JSON.parse(ref); return Array.isArray(p) ? p.map(String).filter(Boolean) : []; } catch { return []; }
  }
  return [];
}

/**
 * Reference kinds: the platform mints them, vendors link to them.
 *
 * A brand, a model, a trim and a factory are the same object for every dealer on
 * the market. Making one claimable is how fifty copies of a single X5 appear, each
 * with its own spec sheet — the exact failure this typology was drawn to prevent.
 */
export const REFERENCE_TYPES = ['vehicle_brand', SPEC_TYPE, 'vehicle_trim', 'factory', RETIRED_NODE_TYPE] as const;

export function isReferenceType(typeId: string): boolean {
  return (REFERENCE_TYPES as readonly string[]).includes(typeId);
}

/**
 * The prospective definition of a kind, before it reaches the table.
 *
 * A kind is the unit of settling: shelves, nesting, claimability and authority
 * have to agree in one write, or the admin produces a kind that exists but cannot
 * be used — which is the state most of this database is in today.
 */
export interface KindDefinitionInput {
  id: string;
  name?: string;
  is_parent?: number | boolean;
  parent_id?: string | null;
  market_id?: string | null;
  vendor_claimable?: number | boolean;
  sections?: unknown;
  own_sections?: unknown;
  allowed_child_kinds?: unknown;
}

export async function assertKindDefinition(input: KindDefinitionInput): Promise<void> {
  const id = String(input.id ?? '').trim();
  if (!id) throw new TypologyError('A business type needs an id.');

  const isParent = !!input.is_parent;
  const claimable = !!input.vendor_claimable;
  // 0008 made this true for every parent in the typology. A parent a vendor could
  // claim is a category page every dealer invents for themselves, and the tree
  // stops meaning anything.
  if (isParent && claimable) {
    throw new TypologyError(
      `"${input.name ?? id}" is a parent kind, so it is a template — nothing claims a category as its own page. Set vendor_claimable to 0.`,
    );
  }

  if (id === RETIRED_NODE_TYPE && claimable) {
    throw new TypologyError(
      'car_listing was retired by migration 0009: a car is a row in `units`. Making the '
      + 'kind claimable again would put thin car pages back in the sitemap.',
    );
  }

  // Reference data is not a page a vendor claims, whatever the flag says.
  if (claimable && isReferenceType(id)) {
    throw new TypologyError(
      `"${input.name ?? id}" is reference data that every seller links to. A vendor that `
      + 'could claim it would create its own copy, and one model would stop being one model.',
    );
  }

  await assertShelvesExist(input.sections, `"${id}".sections`);
  await assertShelvesExist(input.own_sections, `"${id}".own_sections`);

  if (input.parent_id) {
    const parent = await queryOne<{ id: string; name: string; is_parent: number }>(
      'SELECT id, name, is_parent FROM business_types WHERE id = ?',
      [input.parent_id],
    );
    if (!parent) throw new TypologyError(`Parent kind "${input.parent_id}" does not exist.`);
    if (!parent.is_parent) {
      throw new TypologyError(
        `"${parent.name}" is not a parent kind, so nothing may be declared beneath it.`,
      );
    }
  }

  const children = parseIdList(input.allowed_child_kinds);
  if (children.length) {
    if (children.includes(id)) {
      throw new TypologyError(`"${id}" cannot allow itself as a child kind — that is a tree with a knot in it.`);
    }
    const rows = await query<{ id: string }>(
      `SELECT id FROM business_types WHERE id IN (${children.map(() => '?').join(',')})`,
      children,
    );
    const known = new Set(rows.map((r) => r.id));
    const ghosts = children.filter((c) => !known.has(c));
    if (ghosts.length) {
      throw new TypologyError(`allowed_child_kinds names unknown kinds: ${ghosts.join(', ')}.`);
    }
  }

  if (input.market_id) {
    const market = await queryOne<{ id: string }>('SELECT id FROM markets WHERE id = ?', [input.market_id]);
    if (!market) throw new TypologyError(`Market "${input.market_id}" is not registered.`);
  }
}

/**
 * May this shelf become relational while definitions sit on it?
 *
 * Refused rather than silently orphaned: the typed answers do not vanish, they
 * stop printing, which is a far worse failure than an error message. Going `mixed`
 * is allowed unasked — a query with its own notes beside it is the ordinary case
 * (`sec_auto_inventory` lists the sellers *and* carries a typed warranty line).
 */
export async function assertShelfDemoteable(sectionId: string, toKind: ContentKind): Promise<void> {
  if (toKind !== 'relational') return;
  const holding = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM form_fields
      WHERE section_id = ? AND COALESCE(excluded, 0) = 0`,
    [sectionId],
  );
  if (holding && holding.n > 0) {
    throw new TypologyError(
      `${holding.n} definition${holding.n === 1 ? '' : 's'} still answer this shelf, so it is mixed at best — a query plus typed answers. Exclude or move them first to make it purely relational.`,
    );
  }
}

// ── the two write guards on a unit's own data ─────────────────────────────────
/**
 * May this section/key live in a unit's `overrides`?
 *
 * Two refusals, both earned. A key the model's kind does not define would be an
 * answer with no question on any page that renders the model. A key that names a
 * real column would create the second answer to one question — which is exactly
 * how `sec_auto_specs.power_hp` and `sec_auto_engine.max_power_hp` ended up
 * stating the same fact twice until 0008 deleted one.
 */
export async function assertUnitOverrideKey(sectionId: string, name: string): Promise<void> {
  const collision = collidesWithUnitTerm(name);
  if (collision) {
    throw new TypologyError(
      `"${name}" is answered by the unit column ${collision}. Set it on the unit itself, `
      + 'not as a specification override.',
    );
  }
  const defined = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM form_fields
      WHERE business_type_id = ? AND section_id = ? AND name = ? AND COALESCE(excluded, 0) = 0`,
    [SPEC_TYPE, sectionId, name],
  );
  if (!defined || defined.n === 0) {
    throw new TypologyError(
      `No "${SPEC_TYPE}" defines ${sectionId}.${name}, so no page could label it. `
      + 'Add the question to the model first, then answer it per car.',
    );
  }
}

/**
 * Is this shelf actually part of this kind's typology?
 *
 * The cheapest way for an authoring surface to accumulate invisible data: a
 * field on a shelf the kind never renders is written, reported as saved, and
 * printed nowhere for ever.
 */
export async function assertSectionCarried(businessTypeId: string, sectionId: string): Promise<void> {
  const sections = await resolveSections(businessTypeId);
  if (sections.some((s) => s.id === sectionId)) return;
  const carried = sections.map((s) => s.id).join(', ') || 'none';
  throw new TypologyError(
    `A ${businessTypeId} does not carry the shelf "${sectionId}" (it carries: ${carried}). `
    + 'Anything authored there is stored and never printed.',
  );
}

/**
 * May this field be declared at all?
 *
 * Called before the admin writes a definition, because a definition is a promise
 * every future page keeps. Three checks: the name must not restate a unit column,
 * the section must actually be carried by the kind, and one kind must not ask the
 * same question in two shelves.
 */
export async function assertFieldDeclarable(
  businessTypeId: string,
  sectionId: string,
  name: string,
): Promise<void> {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new TypologyError('A field needs a name.');

  // A definition on a shelf the graph answers is stored, beaten and never printed.
  await assertShelfAcceptsFields(sectionId);

  // 0009 retired the kind: its nodes became units, so a new definition here would
  // be authored against a type no page is ever rendered from again.
  if (businessTypeId === RETIRED_NODE_TYPE) {
    throw new TypologyError(
      'car_listing is retired — a car is a row in `units` now. Declare the question on '
      + 'the vehicle_model, and each car answers it with its own override.',
    );
  }

  if (businessTypeId === SPEC_TYPE) {
    const collision = collidesWithUnitTerm(trimmed);
    if (collision) {
      throw new TypologyError(
        `"${trimmed}" is the same question the ${collision} column already answers on every `
        + 'car. Declare it on the inventory screen instead — a second copy would drift the '
        + 'first time a price changed.',
      );
    }
  }

  await assertSectionCarried(businessTypeId, sectionId);

  const already = await query<{ section_id: string; name: string }>(
    `SELECT section_id, name FROM form_fields
      WHERE business_type_id = ? AND name = ? AND COALESCE(excluded, 0) = 0`,
    [businessTypeId, trimmed],
  );
  const elsewhere = already.filter((f) => f.section_id !== sectionId);
  if (elsewhere.length) {
    throw new TypologyError(
      `"${trimmed}" is already defined for this kind under ${elsewhere[0].section_id}. `
      + 'One question, one answer, one shelf: two copies drift the first time a value changes.',
    );
  }
}

/**
 * May this definition be deleted?
 *
 * A units row can hold an answer to a question nobody asked any more: the value
 * stays in `overrides`, loses its label, and silently disappears from the page.
 * So a field still carrying an answer is refused rather than orphaned -- the data
 * is moved by a person who decides what should happen to it.
 */
export async function assertFieldDeletable(fieldId: string): Promise<void> {
  // The admin screen passes the numeric row id; a caller that only knows the
  // field's name is answered too, but the id is tried first so a field actually
  // named "12" can never be confused with row 12.
  const field = await queryOne<{ section_id: string; name: string }>(
    'SELECT section_id, name FROM form_fields WHERE id = ? LIMIT 1',
    [fieldId],
  ) ?? await queryOne<{ section_id: string; name: string }>(
    'SELECT section_id, name FROM form_fields WHERE name = ? LIMIT 1',
    [fieldId],
  );
  if (!field) return; // nothing to orphan
  const holding = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM units
      WHERE json_extract(overrides, '$.' || ? || '.' || ?) IS NOT NULL`,
    [field.section_id, field.name],
  );
  if (holding && holding.n > 0) {
    throw new TypologyError(
      `${holding.n} car${holding.n === 1 ? '' : 's'} still answer ${field.section_id}.${field.name}. `
      + 'Clear those answers first, or exclude the field so it stops printing without losing history.',
    );
  }
}

/**
 * May this actor edit this definition?
 *
 * A template section belongs to the kind that authored it. Until something writes
 * `section_origin`, nothing is marked as a template -- a probe of the local
 * database shows all 48 definitions NULL -- so this guard is honest about being
 * dormant rather than pretending to police rows that do not exist.
 */
export function canEditFormField(
  role: string | null | undefined,
  opts: { sectionOrigin?: string | null; typeVendorClaimable?: number },
): { allowed: boolean; reason?: string } {
  if (role === 'platform_admin') return { allowed: true };
  if (opts.sectionOrigin === 'template') {
    return { allowed: false, reason: 'This shelf came from the kind template. Only the platform team edits it.' };
  }
  if (opts.typeVendorClaimable === 0) {
    return { allowed: false, reason: 'Reference data. A vendor answers it, never redefines it.' };
  }
  return { allowed: true };
}

/** The columns a declared field must never restate, for a screen that lists them. */
export const PROTECTED_UNIT_TERMS: readonly string[] = UNIT_TERM_COLUMNS;
