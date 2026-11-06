/**
 * Business creation + minisite provisioning (D1 / SQLite).
 *
 * A fresh, minimal take on the marketplace concept: derive a slug, refuse a
 * collision with reserved route segments, wire the node into the tree
 * (parent_business_id + materialized path), and mark child minisites so the
 * renderer knows a node was auto-provisioned beneath a parent.
 *
 * Phase E (authoring/admin) reuses these primitives behind an authenticated
 * API; nothing here touches MySQL or the legacy marketplace modules.
 */
import { queryOne, execute, batch, type Statement } from '@/lib/db';
import { assertAcyclic, computePath, refreshSubtreePaths } from '@/lib/topology';
import { assertInstantiable, assertNesting } from '@/lib/typology';

/** First path segment of the English tree + framework/infra routes. */
export const RESERVED_SLUGS = new Set([
  'en', 'api', 'admin', 'login', 'logout', 'assets', 'favicon.ico',
  '_next', 'robots.txt', 'sitemap.xml',
]);

export function normalizeName(name: string): string {
  return String(name ?? '').replace(/\s+/g, ' ').trim();
}

/** URL-safe slug: lowercase, latin+digits+dashes. Falls back to a UUID suffix. */
export function slugify(name: string): string {
  const base = normalizeName(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `biz-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}

/** Produce a slug that is neither reserved nor already taken in D1. */
export async function ensureUniqueSlug(rawName: string, preferred?: string): Promise<string> {
  let slug = preferred?.trim() ? slugify(preferred) : slugify(rawName);
  if (RESERVED_SLUGS.has(slug.toLowerCase())) slug = `${slug}-biz`;
  // If the source slug came back empty (e.g. an all-Arabic name), seed a token.
  if (slug === '' || slug === 'biz') slug = `biz-${globalThis.crypto.randomUUID().slice(0, 8)}`;

  let candidate = slug;
  let n = 0;
  // Loop is bounded well below typical traffic; collisions resolve with -2, -3...
  while (n < 50) {
    const taken = await queryOne<{ id: string }>(
      'SELECT id FROM businesses WHERE slug = ?',
      [candidate],
    );
    if (!taken) return candidate;
    n++;
    candidate = `${slug}-${n + 1}`;
  }
  return `${slug}-${globalThis.crypto.randomUUID().slice(0, 6)}`;
}

export interface CreateBusinessInput {
  name: string;
  name_ar?: string | null;
  type_id: string;
  market_id?: string | null;
  parent_business_id?: string | null;
  slug?: string;
  custom_data?: Record<string, unknown>;
  published?: boolean;
  id?: string;
  /**
   * Who is asking. The typology distinguishes the platform authoring reference
   * data from a vendor claiming a page of their own, and only the actor can say
   * which of the two this insert is.
   */
  actor_role?: string | null;
}

export interface BusinessNode {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  type_id: string;
  market_id: string | null;
  parent_business_id: string | null;
  path: string;
  minisite_mode: string;
}

/**
 * Creates a business node and wires it into the tree. When a parent is given
 * the child is auto-provisioned as a minisite (minisite_mode='child'); its
 * materialized path is computed and any pre-existing subtree paths refreshed.
 */
export async function createBusinessNode(input: CreateBusinessInput): Promise<BusinessNode> {
  const id = input.id ?? globalThis.crypto.randomUUID();
  const name = normalizeName(input.name);
  if (!name) throw new Error('Business name is required.');

  const type = await queryOne<{ id: string; market_id: string | null }>(
    'SELECT id, market_id FROM business_types WHERE id = ?',
    [input.type_id],
  );
  if (!type) throw new Error(`Unknown business type "${input.type_id}".`);

  // Decided before anything is written: a car is a unit row and not a node, and
  // a vendor does not get to invent a copy of reference data it merely answers.
  await assertInstantiable(input.type_id, { actorRole: input.actor_role ?? null });

  const parentBusinessId = input.parent_business_id ?? null;
  if (parentBusinessId) {
    await assertAcyclic(id, parentBusinessId);
    const parent = await queryOne<{ id: string; type_id: string }>(
      'SELECT id, type_id FROM businesses WHERE id = ?',
      [parentBusinessId],
    );
    if (!parent) throw new Error(`Parent business "${parentBusinessId}" not found.`);
    // Nesting is a rule between kinds, so it needs the parent's kind, not just
    // its existence: a showroom holds no children because its stock is rows.
    await assertNesting(parent.type_id, input.type_id);
  }

  const slug = await ensureUniqueSlug(name, input.slug);
  const marketId = input.market_id ?? type.market_id ?? 'automotive';
  const minisiteMode = parentBusinessId ? 'child' : 'standalone';
  const customData = JSON.stringify(input.custom_data ?? {});
  const published = input.published === false ? 0 : 1;

  // Tree placement can only be finalised once the row exists (path walks parents).
  await batch([
    {
      sql: `INSERT INTO businesses
              (id, name, name_ar, slug, type_id, market_id, parent_business_id, path, minisite_mode, custom_data, published, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      params: [id, name, input.name_ar ?? null, slug, input.type_id, marketId, parentBusinessId, '', minisiteMode, customData, published],
    },
  ] as Statement[]);

  const path = await computePath(id);
  await execute('UPDATE businesses SET path = ? WHERE id = ?', [path, id]);
  await refreshSubtreePaths(id);

  return {
    id, name, name_ar: input.name_ar ?? null, slug,
    type_id: input.type_id, market_id: marketId,
    parent_business_id: parentBusinessId, path, minisite_mode: minisiteMode,
  };
}
