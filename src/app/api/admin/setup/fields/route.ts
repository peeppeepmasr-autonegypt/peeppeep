/**
 * /api/admin/setup/fields
 * GET  ?business_type_id=&section_id= — field_groups + form_fields for a slot
 * POST — create a field_group or form_field (body.kind = 'group' | 'field')
 * DELETE ?kind=group|field&id=… — remove a group or field
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query, execute } from '@/lib/db';
import {
  TypologyError,
  assertFieldDeclarable,
  assertFieldDeletable,
  assertSectionCarried,
  assertShelfAcceptsFields,
} from '@/lib/typology';

const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

async function auth(req: Request) {
  const hdrs = await headers();
  const fake = new Request(req.url, { headers: Object.fromEntries(hdrs.entries()) });
  const user = await getAdminUser(fake);
  return user?.role === 'platform_admin' ? user : null;
}

/**
 * A typology refusal is a sentence about the data model, not a server fault, so
 * it answers 409 with the reason instead of a 500 the admin cannot act on.
 * Anything else keeps travelling upward.
 */
function refuse(e: unknown): Response {
  if (e instanceof TypologyError) return err(e.message, 409);
  throw e;
}

export async function GET(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const { searchParams } = new URL(req.url);
  const btype = searchParams.get('business_type_id');
  const section = searchParams.get('section_id');
  if (!btype || !section) return err('business_type_id and section_id are required');

  const groups = await query(
    `SELECT id, business_type_id, section_id, name, label, label_ar, sort_order, active
       FROM field_groups WHERE business_type_id = ? AND section_id = ? ORDER BY sort_order`,
    [btype, section],
  );
  const fields = await query(
    `SELECT id, business_type_id, section_id, name, label, label_ar, field_type, group_key,
            sort_order, options, show_as_slide, destination
       FROM form_fields WHERE business_type_id = ? AND section_id = ? ORDER BY sort_order`,
    [btype, section],
  );
  return ok({ groups, fields });
}

export async function POST(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const b = await req.json() as Record<string, unknown>;
  const kind = b.kind as string;

  try {
    if (kind === 'group') {
      const { business_type_id, section_id, name, label, label_ar, sort_order = 99, active = 1 } = b as {
        business_type_id?: string; section_id?: string; name?: string;
        label?: string; label_ar?: string; sort_order?: number; active?: number;
      };
      if (!business_type_id || !section_id || !name) return err('business_type_id, section_id, name required');
      // A group on a shelf the kind never renders would be an invisible drawer.
      await assertSectionCarried(business_type_id, section_id);
      // …and a group on a shelf the graph answers would be a form nobody reads.
      await assertShelfAcceptsFields(section_id);
      const id = `fg_${business_type_id}_${section_id}_${name}`.replace(/[^a-z0-9_]/gi, '_');
      await execute(
        `INSERT OR REPLACE INTO field_groups (id, business_type_id, section_id, name, label, label_ar, sort_order, active)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id, business_type_id, section_id, name, label ?? name, label_ar ?? null, sort_order, active ? 1 : 0],
      );
      return ok({ ok: true, id }, 201);
    }

    if (kind === 'field') {
      const { business_type_id, section_id, name, label, label_ar, field_type = 'text',
        group_key, sort_order = 99, options, show_as_slide = 0, destination } = b as {
        business_type_id?: string; section_id?: string; name?: string;
        label?: string; label_ar?: string; field_type?: string; group_key?: string;
        sort_order?: number; options?: string | null; show_as_slide?: number;
        destination?: string | null;
      };
      if (!business_type_id || !section_id || !name) return err('business_type_id, section_id, name required');
      // A definition is a promise every future page keeps: it must not restate a
      // unit column, sit on an uncarried shelf, or ask a question twice.
      await assertFieldDeclarable(business_type_id, section_id, name);
      await execute(
        `INSERT OR REPLACE INTO form_fields
           (business_type_id, section_id, name, label, label_ar, field_type, group_key, sort_order, options, show_as_slide, destination)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [business_type_id, section_id, name, label ?? name, label_ar ?? null,
         field_type, group_key ?? null, sort_order, options ?? null, show_as_slide ? 1 : 0, destination ?? null],
      );
      return ok({ ok: true }, 201);
    }

    return err('kind must be "group" or "field"');
  } catch (e) {
    return refuse(e);
  }
}

export async function DELETE(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const id = searchParams.get('id');
  if (!kind || !id) return err('kind and id required');

  try {
    if (kind === 'group') {
      await execute(`DELETE FROM field_groups WHERE id = ?`, [id]);
      return ok({ ok: true });
    }
    if (kind === 'field') {
      // Refused while real cars still answer it: deleting the question would keep
      // the answer, lose its label, and quietly drop it off every page.
      await assertFieldDeletable(id);
      await execute(`DELETE FROM form_fields WHERE id = ?`, [id]);
      return ok({ ok: true });
    }
    return err('kind must be "group" or "field"');
  } catch (e) {
    return refuse(e);
  }
}
