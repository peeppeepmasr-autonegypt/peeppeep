/**
 * Topology engine for the automotive instance tree (D1 / SQLite).
 *
 * Two orthogonal layers, mirroring the schema:
 *   - the TREE: businesses.parent_business_id (owns / belongs-to), validated
 *     here for self-parent, cycles and depth, with a materialized `slug` path
 *     recomputed down the subtree on every move.
 *   - the GRAPH: business_relationships (cross-world associations such as a car
 *     and its factory, insurer, or seller). The vocabulary and direction rules
 *     live in RELATION_TYPES so an unknown relation is refused on write.
 *
 * Fresh rewrite of the marketplace concept — no MySQL, no legacy imports.
 */
import { query, queryOne, execute } from '@/lib/db';

export const MAX_TREE_DEPTH = 15;

export class TopologyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'TopologyError';
    this.status = status;
  }
}

// ── Relation vocabulary ──────────────────────────────────────────────────────
type RelationSpec = { from: string[]; to: string[]; bidirectional?: boolean };

export const RELATION_TYPES: Record<string, RelationSpec> = {
  manufactured_at:  { from: ['vehicle_model', 'vehicle_trim'], to: ['factory'] },
  sold_by:          { from: ['vehicle_brand', 'vehicle_model', 'vehicle_trim'], to: ['main_agency', 'showroom', 'distributor', 'agent_broker', 'used_car_dealer'] },
  distributed_by:   { from: ['vehicle_brand', 'vehicle_model'], to: ['distributor', 'main_agency'] },
  represented_by:   { from: ['vehicle_brand'], to: ['main_agency'] },
  serviced_by:      { from: ['vehicle_model', 'vehicle_brand'], to: ['service_center'] },
  insured_by:       { from: ['vehicle_model', 'vehicle_brand'], to: ['insurance_company'] },
  financed_by:      { from: ['vehicle_model'], to: ['finance_bank', 'leasing_company'] },
  parts_for:        { from: ['spare_parts', 'accessories_detailing'], to: ['vehicle_model', 'vehicle_brand'] },
  compatible_with:  { from: ['vehicle_model', 'spare_parts', 'accessories_detailing'], to: ['vehicle_model', 'spare_parts', 'accessories_detailing'], bidirectional: true },
  agent_of:         { from: ['agent_broker'], to: ['main_agency', 'showroom', 'distributor'] },
};

// ── The tree: cycle / depth safety ───────────────────────────────────────────
export async function assertAcyclic(
  businessId: string,
  newParentId: string | null,
): Promise<void> {
  if (!newParentId) return;
  if (newParentId === businessId) {
    throw new TopologyError('A node cannot be its own parent.');
  }
  let cursor: string | null = newParentId;
  let depth = 0;
  while (cursor) {
    if (cursor === businessId) {
      throw new TopologyError('Cycle detected: that parent is already a descendant of this node.');
    }
    if (depth++ >= MAX_TREE_DEPTH) {
      throw new TopologyError(`Tree would exceed the maximum depth of ${MAX_TREE_DEPTH}.`, 409);
    }
    const row: { parent_business_id: string | null } | null = await queryOne<{ parent_business_id: string | null }>(
      'SELECT parent_business_id FROM businesses WHERE id = ?',
      [cursor],
    );
    cursor = row?.parent_business_id ?? null;
  }
}

/** Materialized slug path: /brand/model/trim. */
export async function computePath(businessId: string): Promise<string> {
  const slugs: string[] = [];
  let cursor: string | null = businessId;
  let guard = 0;
  while (cursor && guard++ <= MAX_TREE_DEPTH) {
    const row: { slug: string | null; parent_business_id: string | null } | null = await queryOne<{ slug: string | null; parent_business_id: string | null }>(
      'SELECT slug, parent_business_id FROM businesses WHERE id = ?',
      [cursor],
    );
    if (!row) break;
    slugs.unshift(row.slug || cursor);
    cursor = row.parent_business_id ?? null;
  }
  return `/${slugs.join('/')}`;
}

/**
 * Recompute `path` for every descendant of a node. Call right after the node's
 * own parent/path is set; it rewrites only descendants of the given root.
 */
export async function refreshSubtreePaths(rootId: string): Promise<void> {
  const root = await queryOne<{ id: string; path: string | null }>(
    'SELECT id, path FROM businesses WHERE id = ?',
    [rootId],
  );
  if (!root) return;
  let frontier: { id: string; path: string | null }[] = [root];
  let visited = 0;
  while (frontier.length && visited < 5000) {
    const next: { id: string; path: string | null }[] = [];
    for (const node of frontier) {
      const kids = await query<{ id: string; slug: string | null }>(
        'SELECT id, slug FROM businesses WHERE parent_business_id = ?',
        [node.id],
      );
      for (const k of kids) {
        const childPath = `${node.path || ''}/${k.slug || k.id}`;
        await execute('UPDATE businesses SET path = ? WHERE id = ?', [childPath, k.id]);
        next.push({ id: k.id, path: childPath });
        visited++;
      }
    }
    frontier = next;
  }
}

/** Ancestor chain (root first) — powers breadcrumbs on a car/vendor minisite. */
export type AncestryNode = { id: string; name: string; name_ar: string | null; slug: string | null };

export async function getAncestry(businessId: string): Promise<AncestryNode[]> {
  const chain: AncestryNode[] = [];
  let cursor: string | null = businessId;
  let guard = 0;
  while (cursor && guard++ <= MAX_TREE_DEPTH) {
    const row: AncestryNode & { parent_business_id: string | null } | null = await queryOne<AncestryNode & { parent_business_id: string | null }>(
      'SELECT id, name, name_ar, slug, parent_business_id FROM businesses WHERE id = ?',
      [cursor],
    );
    if (!row) break;
    chain.unshift({ id: row.id, name: row.name, name_ar: row.name_ar ?? null, slug: row.slug });
    cursor = row.parent_business_id ?? null;
  }
  return chain;
}

// ── The graph: edge validation ───────────────────────────────────────────────
type NodeLite = { id: string; type_id: string; market_id: string | null; status: string };

async function loadNode(id: string, label: string): Promise<NodeLite> {
  const row = await queryOne<NodeLite>(
    'SELECT id, type_id, market_id, status FROM businesses WHERE id = ?',
    [id],
  );
  if (!row) throw new TopologyError(`${label} business "${id}" does not exist.`, 404);
  return row;
}

/** Validates a prospective relationship against the vocabulary + endpoints. */
export async function validateRelationship(
  fromId: string,
  toId: string,
  relationType: string,
): Promise<{ from: NodeLite; to: NodeLite }> {
  const spec = RELATION_TYPES[relationType];
  if (!spec) {
    throw new TopologyError(
      `Unknown relation_type "${relationType}". Allowed: ${Object.keys(RELATION_TYPES).join(', ')}.`,
    );
  }
  if (fromId === toId) throw new TopologyError('A business cannot relate to itself.');

  const from = await loadNode(fromId, 'Source');
  const to = await loadNode(toId, 'Target');

  const matches = (fromType: string, toType: string) =>
    spec.from.includes(fromType) && spec.to.includes(toType);

  const forward = matches(from.type_id, to.type_id);
  const reverseAllowed = !!spec.bidirectional && matches(to.type_id, from.type_id);
  if (!forward && !reverseAllowed) {
    throw new TopologyError(
      `Invalid direction for "${relationType}": a "${from.type_id}" cannot relate to a "${to.type_id}".` +
      ` Expected from in [${spec.from.join('|')}] to in [${spec.to.join('|')}].`,
    );
  }
  return { from, to };
}

export function allowedRelationTypes(): string[] {
  return Object.keys(RELATION_TYPES);
}
