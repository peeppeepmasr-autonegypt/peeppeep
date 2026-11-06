/**
 * /api/admin/topology/tree — Full business tree as nested JSON.
 *
 * GET → returns { tree: [...roots], total_nodes: N, total_edges: M }
 *
 * Algorithm:
 *   1. Fetch all active businesses in one query.
 *   2. Fetch per-node outbound relationship counts.
 *   3. Fetch total edge count.
 *   4. Build nested tree by grouping on parent_business_id.
 *   5. Return roots (nodes whose parent_business_id IS NULL).
 */
export const runtime = 'edge';

import { requirePlatformAdmin } from '@/lib/admin-auth';
import { query, queryOne } from '@/lib/db';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

interface BusinessRow {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  type_id: string;
  status: string;
  parent_business_id: string | null;
  custom_domain: string | null;
}

interface EdgeCountRow {
  bid: string;
  edge_count: number;
}

interface TreeNode {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  type_id: string;
  custom_domain: string | null;
  edge_count: number;
  children: TreeNode[];
}

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    // 1. All active businesses
    const businesses = await query<BusinessRow>(
      `SELECT id, name, name_ar, slug, type_id, status, parent_business_id, custom_domain
       FROM businesses
       WHERE status = 'active'
       ORDER BY name`,
    );

    // 2. Outbound edge counts per node
    const edgeCounts = await query<EdgeCountRow>(
      `SELECT from_business_id AS bid, COUNT(*) AS edge_count
       FROM business_relationships
       GROUP BY from_business_id`,
    );

    // 3. Total edge count
    const edgeTotalRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM business_relationships`,
    );
    const total_edges = edgeTotalRow?.total ?? 0;

    // Build a lookup: businessId → edge_count
    const edgeMap = new Map<string, number>();
    for (const row of edgeCounts) {
      edgeMap.set(row.bid, row.edge_count);
    }

    // 4. Build nested tree
    const nodeMap = new Map<string, TreeNode>();
    for (const b of businesses) {
      nodeMap.set(b.id, {
        id: b.id,
        name: b.name,
        name_ar: b.name_ar,
        slug: b.slug,
        type_id: b.type_id,
        custom_domain: b.custom_domain,
        edge_count: edgeMap.get(b.id) ?? 0,
        children: [],
      });
    }

    const roots: TreeNode[] = [];
    for (const b of businesses) {
      const node = nodeMap.get(b.id)!;
      if (b.parent_business_id == null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(b.parent_business_id);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not in active set — treat as root
          roots.push(node);
        }
      }
    }

    return new Response(
      JSON.stringify({ tree: roots, total_nodes: businesses.length, total_edges }),
      { status: 200, headers: JSON_HEADERS },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
