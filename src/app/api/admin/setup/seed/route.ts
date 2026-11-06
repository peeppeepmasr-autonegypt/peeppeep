/**
 * /api/admin/setup/seed
 *
 * Read-only status probe. The buttons this endpoint used to serve ran a second
 * author of the same facts migrations had already written: the seed arrays
 * here mirrored 0002 and 0004, so an admin pressing "Run All Seeds" would
 * either duplicate migration content silently or, worse, overwrite it with a
 * version that had drifted by the time the migration evolved. D1's
 * D1_MIGRATIONS table stores only id/name/applied_at — no SQL text — so
 * "buttons re-run the migration" was never actually possible.
 *
 * The architecture settled in 0010 says migrations are the only authoring
 * channel. This endpoint now reports the current shape; the checklist at
 * /api/admin/setup/contract tells you what a specific kind is still missing.
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query } from '@/lib/db';

const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

async function auth(req: Request) {
  const hdrs = await headers();
  const fake = new Request(req.url, { headers: Object.fromEntries(hdrs.entries()) });
  const user = await getAdminUser(fake);
  return user?.role === 'platform_admin' ? user : null;
}

export async function GET(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);

  const [mkt, bt, sec, fg, ff] = await Promise.all([
    query<{ c: number }>(`SELECT COUNT(*) AS c FROM markets`),
    query<{ c: number }>(`SELECT COUNT(*) AS c FROM business_types`),
    query<{ c: number }>(`SELECT COUNT(*) AS c FROM sections`),
    query<{ c: number }>(`SELECT COUNT(*) AS c FROM field_groups WHERE business_type_id = 'vehicle_model'`),
    query<{ c: number }>(`SELECT COUNT(*) AS c FROM form_fields WHERE business_type_id = 'vehicle_model' AND COALESCE(excluded,0) = 0`),
  ]);

  return ok({
    status: {
      markets:         { count: mkt[0]?.c ?? 0, seeded: (mkt[0]?.c ?? 0) >= 1 },
      business_types:  { count: bt[0]?.c ?? 0, seeded: (bt[0]?.c ?? 0) >= 19 },
      sections:        { count: sec[0]?.c ?? 0, seeded: (sec[0]?.c ?? 0) >= 22 },
      field_groups_vm: { count: fg[0]?.c ?? 0, seeded: (fg[0]?.c ?? 0) >= 12 },
      form_fields_vm:  { count: ff[0]?.c ?? 0, seeded: (ff[0]?.c ?? 0) >= 30 },
    },
    note: 'Authoring happens in migrations, not here. See /api/admin/setup/contract for the settled checklist.',
  });
}

export async function POST() {
  return err(
    'Seed authoring moved to migrations in 0010. Run `npm.cmd run db:migrate:local` to apply, '
    + 'then read the settled checklist at /api/admin/setup/contract.',
    410,
  );
}
