/**
 * /api/admin/setup/contract
 *
 * The settled checklist. Read-only: for every kind the platform recognises,
 * it reports whether the four invariants a business type has to satisfy are
 * actually satisfied on this database. This replaces the Seed buttons, which
 * hardcoded an *authoring* mirror of what migrations already wrote — an
 * authorship surface the architecture says belongs to `migrations/*.sql`
 * alone (D1_MIGRATIONS stores no SQL text, so re-running a migration from
 * the admin is not even possible; the buttons would have re-run a *copy*
 * of the migration's shape, drifted by the time they were next read).
 *
 * Four invariants per kind:
 *   1. Existence   — the kind is a leaf, has an id, and knows its shape.
 *   2. Shelf set   — resolveSections returns at least one shelf.
 *   3. Vocabulary  — every authored/mixed shelf the kind carries has ≥1 field.
 *   4. Page shape  — kind-pages.ts names a route for it.
 *
 * A parent kind (a template, never rendered) is exempted from vocabulary
 * because nothing instantiates it. A reference kind (brand/model/trim/factory)
 * is exempted from sellability. car_listing is marked retired with the reason.
 */
export const runtime = 'edge';

import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query } from '@/lib/db';
import { resolveSections } from '@/lib/minisite';
import { RETIRED_NODE_TYPE, type ContentKind } from '@/lib/typology';
import { kindPageFor, knownKindPages } from '@/lib/kind-pages';
const J = { 'Content-Type': 'application/json' };
const ok = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: J });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

async function auth(req: Request) {
  const hdrs = await headers();
  const fake = new Request(req.url, { headers: Object.fromEntries(hdrs.entries()) });
  const user = await getAdminUser(fake);
  return user?.role === 'platform_admin' ? user : null;
}

interface KindKind {
  id: string; name: string; name_ar: string | null;
  is_parent: number; vendor_claimable: number;
}

interface ShelfCounts {
  section_id: string;
  name: string;
  content_kind: ContentKind;
  fields: number;
}

interface KindReport {
  kind: string;
  name: string;
  name_ar: string | null;
  is_parent: number;
  vendor_claimable: number;
  page: { shape: string; route: string; readFn: string; reason?: string };
  shelves: ShelfCounts[];
  invariants: {
    exists: boolean;
    hasShelves: boolean;
    hasVocabulary: boolean;
    hasPageContract: boolean;
  };
  missing: string[];
  status: 'settled' | 'pending' | 'retired' | 'template';
}

export async function GET(req: Request) {
  if (!await auth(req)) return err('unauthorized', 401);

  const kinds = await query<KindKind>(
    `SELECT id, name, name_ar, is_parent, vendor_claimable
       FROM business_types ORDER BY is_parent DESC, sort_order`,
  );

  // One pass over the fields table grouped by (kind, shelf) is cheaper than
  // N*M lookups and lets the checklist agree with the admin form on what a
  // "live field" is (excluded = 0).
  const fieldRows = await query<{ bt: string; sec: string; n: number }>(
    `SELECT business_type_id AS bt, section_id AS sec, COUNT(*) AS n
       FROM form_fields WHERE COALESCE(excluded, 0) = 0
      GROUP BY business_type_id, section_id`,
  );
  const fieldIndex = new Map<string, number>();
  for (const r of fieldRows) fieldIndex.set(`${r.bt}::${r.sec}`, r.n);

  // resolveSections returns the shelf set; the kind of each shelf is a
  // separate lookup because the read path in minisite.ts does not need it.
  // Loading the whole table once is cheaper than N per-kind queries and the
  // sections table is small (23 rows). content_kind is data since 0010.
  const shelfRows = await query<{ id: string; content_kind: ContentKind }>(
    `SELECT id, content_kind FROM sections`,
  );
  const shelfKind = new Map<string, ContentKind>();
  for (const r of shelfRows) shelfKind.set(r.id, r.content_kind);

  const knownPages = knownKindPages();
  const reports: KindReport[] = [];

  for (const kind of kinds) {
    if (kind.id === RETIRED_NODE_TYPE) {
      reports.push({
        kind: kind.id, name: kind.name, name_ar: kind.name_ar,
        is_parent: kind.is_parent, vendor_claimable: kind.vendor_claimable,
        page: { shape: 'none', route: '', readFn: '', reason: 'Retired by 0009: a car is a `units` row now.' },
        shelves: [],
        invariants: { exists: false, hasShelves: false, hasVocabulary: false, hasPageContract: false },
        missing: ['Retired — kept so existing rows carry a truthful type_id.'],
        status: 'retired',
      });
      continue;
    }

    if (kind.is_parent) {
      reports.push({
        kind: kind.id, name: kind.name, name_ar: kind.name_ar,
        is_parent: 1, vendor_claimable: 0,
        page: { shape: 'none', route: '', readFn: '', reason: 'Parent kind: a template, never a page.' },
        shelves: [],
        invariants: { exists: true, hasShelves: false, hasVocabulary: false, hasPageContract: false },
        missing: [],
        status: 'template',
      });
      continue;
    }

    const sections = await resolveSections(kind.id);
    const shelves: ShelfCounts[] = sections.map((s) => {
      const content_kind: ContentKind = shelfKind.get(s.id) ?? 'authored';
      const fields = fieldIndex.get(`${kind.id}::${s.id}`) ?? 0;
      return { section_id: s.id, name: s.name, content_kind, fields };
    });

    const page = await kindPageFor(kind.id);

    // An authored/mixed shelf with zero fields is a heading that renders nothing.
    const authoredMissing = shelves
      .filter((s) => s.content_kind !== 'relational' && s.fields === 0)
      .map((s) => s.section_id);
    const hasVocabulary = authoredMissing.length === 0;
    const hasShelves = shelves.length > 0;
    const hasPageContract = page.shape !== 'none' && Boolean(knownPages[kind.id]);

    const missing: string[] = [];
    if (!hasShelves) missing.push('No shelves resolve for this kind.');
    for (const sec of authoredMissing) missing.push(`Shelf "${sec}" is authored but has no fields.`);
    if (!hasPageContract) missing.push(`Page shape "${page.shape}" is not registered explicitly for this kind in kind-pages.ts.`);

    reports.push({
      kind: kind.id, name: kind.name, name_ar: kind.name_ar,
      is_parent: 0, vendor_claimable: kind.vendor_claimable,
      page, shelves,
      invariants: { exists: true, hasShelves, hasVocabulary, hasPageContract },
      missing,
      status: missing.length ? 'pending' : 'settled',
    });
  }

  return ok({ reports, generatedAt: new Date().toISOString() });
}
