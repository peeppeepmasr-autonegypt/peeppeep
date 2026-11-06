/**
 * /api/admin/relationships — Full CRUD for business_relationships.
 *
 * GET    → list all relationships with from/to business info
 * POST   → create a new relationship (validated via topology engine)
 * DELETE → remove a relationship by ?id=REL_ID
 */
export const runtime = 'edge';

import { requirePlatformAdmin } from '@/lib/admin-auth';
import { query, execute } from '@/lib/db';
import { validateRelationship, TopologyError } from '@/lib/topology';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const relationships = await query(
      `SELECT
         br.id,
         br.relation_type,
         br.is_primary,
         br.created_at,
         f.id   AS from_id,   f.name AS from_name, f.name_ar AS from_name_ar, f.type_id AS from_type,
         t.id   AS to_id,     t.name AS to_name,   t.name_ar AS to_name_ar,   t.type_id AS to_type
       FROM business_relationships br
       JOIN businesses f ON f.id = br.from_business_id
       JOIN businesses t ON t.id = br.to_business_id
       ORDER BY br.created_at DESC
       LIMIT 200`,
    );

    return new Response(JSON.stringify({ relationships }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json()) as {
      from_id: string;
      to_id: string;
      relation_type: string;
      is_primary?: boolean;
    };

    const { from_id, to_id, relation_type, is_primary = false } = body;

    // Validate via topology engine — throws TopologyError on any rule violation
    await validateRelationship(from_id, to_id, relation_type);

    const id = globalThis.crypto.randomUUID();

    try {
      await execute(
        `INSERT INTO business_relationships (id, from_business_id, to_business_id, relation_type, is_primary)
         VALUES (?, ?, ?, ?, ?)`,
        [id, from_id, to_id, relation_type, is_primary ? 1 : 0],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('UNIQUE')) {
        return new Response(JSON.stringify({ error: 'Relationship already exists' }), {
          status: 409,
          headers: JSON_HEADERS,
        });
      }
      throw e; // re-throw for outer catch
    }

    // Fetch the hydrated row so the client can optimistically append it
    const rows = await query<{
      id: string; relation_type: string; is_primary: number; created_at: string;
      from_id: string; from_name: string; from_name_ar: string | null; from_type: string;
      to_id: string; to_name: string; to_name_ar: string | null; to_type: string;
    }>(
      `SELECT br.id, br.relation_type, br.is_primary, br.created_at,
              f.id as from_id, f.name as from_name, f.name_ar as from_name_ar, f.type_id as from_type,
              t.id as to_id, t.name as to_name, t.name_ar as to_name_ar, t.type_id as to_type
         FROM business_relationships br
         JOIN businesses f ON f.id = br.from_business_id
         JOIN businesses t ON t.id = br.to_business_id
        WHERE br.id = ?`,
      [id],
    );

    return new Response(JSON.stringify(rows[0] ?? { ok: true, id }), {
      status: 201,
      headers: JSON_HEADERS,
    });
  } catch (e: unknown) {
    if (e instanceof TopologyError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: JSON_HEADERS,
      });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing required query param: id' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    await execute('DELETE FROM business_relationships WHERE id = ?', [id]);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
