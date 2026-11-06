import { NextRequest, NextResponse } from 'next/server';
import { canAccessBusiness, getAdminUser } from '@/lib/admin-auth';
import { execute, queryOne } from '@/lib/db';
import {
  defaultSiteComponents,
  listSitePages,
  normalizePageSlug,
  validateSiteComponents,
} from '@/lib/site-pages';

export const runtime = 'edge';

function respondError(error: unknown) {
  if (error instanceof Error && error.message.startsWith('D1_ERROR')) {
    console.error('Site page persistence failed:', error);
    return NextResponse.json({ error: 'Could not save this page.' }, { status: 500 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Could not save this page.' },
    { status: 400 },
  );
}

async function authorizeBusiness(request: Request, businessId: string) {
  const user = await getAdminUser(request);
  if (!user) return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  if (!canAccessBusiness(user, businessId)) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  const business = await queryOne<{ id: string; slug: string; name: string; name_ar: string | null; type_id: string }>(
    'SELECT id, slug, name, name_ar, type_id FROM businesses WHERE id = ? AND status = ?',
    [businessId, 'active'],
  );
  if (!business) return { response: NextResponse.json({ error: 'business not found' }, { status: 404 }) };
  if (!['vehicle_brand', 'vehicle_model'].includes(business.type_id)) {
    return { response: NextResponse.json({ error: 'Only make and model pages can use the automotive page builder.' }, { status: 400 }) };
  }
  return { user, business };
}

function readPageInput(body: Record<string, unknown>, home: boolean) {
  const slugInput = typeof body.slug === 'string' ? body.slug : '';
  const slug = home ? '' : normalizePageSlug(slugInput);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const titleAr = typeof body.title_ar === 'string' ? body.title_ar.trim() : '';
  if (!home && (!slug || !title)) throw new Error('A custom page needs a title and a valid URL slug.');
  if (title.length > 120 || titleAr.length > 120) throw new Error('Page titles must be under 120 characters.');
  return {
    slug,
    title: title || 'Home',
    titleAr: titleAr || null,
    components: validateSiteComponents(body.components),
  };
}

async function assertSlugAvailable(
  businessId: string,
  slug: string,
  pageId: string | null,
): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM site_pages
      WHERE business_id = ? AND id <> ?
        AND (draft_slug = ? OR (published = 1 AND published_slug = ?))
      LIMIT 1`,
    [businessId, pageId ?? '', slug, slug],
  );
  if (existing) throw new Error('That page URL is already in use for this site.');
}

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId')?.trim() ?? '';
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  try {
    const auth = await authorizeBusiness(request, businessId);
    if ('response' in auth) return auth.response;
    return NextResponse.json({ pages: await listSitePages(businessId) });
  } catch (error) {
    console.error('Could not load site pages:', error);
    return NextResponse.json({ error: 'Could not load site pages.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  try {
    const auth = await authorizeBusiness(request, businessId);
    if ('response' in auth) return auth.response;
    const input = readPageInput({
      slug: body.slug,
      title: body.title,
      title_ar: body.title_ar,
      components: defaultSiteComponents(),
    }, false);
    await assertSlugAvailable(businessId, input.slug, null);
    const id = `page_${globalThis.crypto.randomUUID()}`;
    await execute(
      `INSERT INTO site_pages
        (id, business_id, page_type, draft_slug, draft_title, draft_title_ar,
         draft_components, updated_at)
       VALUES (?, ?, 'custom', ?, ?, ?, ?, ?)`,
      [id, businessId, input.slug, input.title, input.titleAr, JSON.stringify(input.components), new Date().toISOString()],
    );
    return NextResponse.json({
      page: {
        id, businessId, pageType: 'custom', draftSlug: input.slug,
        draftTitle: input.title, draftTitleAr: input.titleAr,
        draftComponents: input.components, published: false,
        publishedSlug: null, publishedTitle: null, publishedTitleAr: null,
        publishedComponents: null,
      },
    }, { status: 201 });
  } catch (error) {
    return respondError(error);
  }
}

export async function PUT(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
  const pageType = body.pageType === 'home' ? 'home' : body.pageType === 'custom' ? 'custom' : null;
  const pageId = typeof body.pageId === 'string' ? body.pageId : null;
  const action = body.action === 'publish' || body.action === 'unpublish' ? body.action : 'save';
  if (!businessId || !pageType) {
    return NextResponse.json({ error: 'businessId and pageType are required' }, { status: 400 });
  }

  try {
    const auth = await authorizeBusiness(request, businessId);
    if ('response' in auth) return auth.response;

    const existing = pageId
      ? await queryOne<{ id: string; page_type: string; published: number }>(
          'SELECT id, page_type, published FROM site_pages WHERE id = ? AND business_id = ?',
          [pageId, businessId],
        )
      : pageType === 'home'
        ? await queryOne<{ id: string; page_type: string; published: number }>(
            "SELECT id, page_type FROM site_pages WHERE business_id = ? AND page_type = 'home' LIMIT 1",
            [businessId],
          )
        : null;
    if (pageId && !existing) return NextResponse.json({ error: 'page not found' }, { status: 404 });
    if (existing && existing.page_type !== pageType) {
      return NextResponse.json({ error: 'page type cannot be changed' }, { status: 400 });
    }
    if (action === 'unpublish' && (pageType !== 'custom' || !existing?.published)) {
      return NextResponse.json({ error: 'Only a published custom page can be unpublished.' }, { status: 409 });
    }

    const input = readPageInput(body, pageType === 'home');
    await assertSlugAvailable(businessId, input.slug, existing?.id ?? null);
    const id = existing?.id ?? `page_${globalThis.crypto.randomUUID()}`;
    const now = new Date().toISOString();
    if (action === 'unpublish' && existing) {
      await execute(
        `UPDATE site_pages SET draft_slug = ?, draft_title = ?, draft_title_ar = ?,
           draft_components = ?, updated_at = ?, published_slug = NULL,
           published_title = NULL, published_title_ar = NULL,
           published_components = NULL, published = 0
         WHERE id = ? AND business_id = ?`,
        [input.slug, input.title, input.titleAr, JSON.stringify(input.components), now, id, businessId],
      );
      return NextResponse.json({ ok: true, id, action });
    }
    const columns = [
      'id', 'business_id', 'page_type', 'draft_slug', 'draft_title',
      'draft_title_ar', 'draft_components', 'updated_at',
    ];
    const values: unknown[] = [
      id, businessId, pageType, input.slug, input.title,
      input.titleAr, JSON.stringify(input.components), now,
    ];
    if (action === 'publish') {
      columns.push('published_slug', 'published_title', 'published_title_ar', 'published_components', 'published');
      values.push(input.slug, input.title, input.titleAr, JSON.stringify(input.components), 1);
    }
    await execute(
      `INSERT INTO site_pages (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})
       ON CONFLICT(id) DO UPDATE SET
         draft_slug = excluded.draft_slug,
         draft_title = excluded.draft_title,
         draft_title_ar = excluded.draft_title_ar,
         draft_components = excluded.draft_components,
         updated_at = excluded.updated_at
         ${action === 'publish'
           ? `, published_slug = excluded.published_slug,
                published_title = excluded.published_title,
                published_title_ar = excluded.published_title_ar,
                published_components = excluded.published_components,
                published = 1`
           : ''}`,
      values,
    );
    return NextResponse.json({ ok: true, id, action });
  } catch (error) {
    return respondError(error);
  }
}

export async function DELETE(request: NextRequest) {
  let body: { businessId?: string; pageId?: string };
  try {
    body = await request.json() as { businessId?: string; pageId?: string };
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.businessId || !body.pageId) {
    return NextResponse.json({ error: 'businessId and pageId are required' }, { status: 400 });
  }
  const auth = await authorizeBusiness(request, body.businessId);
  if ('response' in auth) return auth.response;
  const page = await queryOne<{ page_type: string; published: number }>(
    'SELECT page_type, published FROM site_pages WHERE id = ? AND business_id = ?',
    [body.pageId, body.businessId],
  );
  if (!page) return NextResponse.json({ error: 'page not found' }, { status: 404 });
  if (page.page_type !== 'custom' || page.published) {
    return NextResponse.json({ error: 'Only unpublished custom pages can be deleted.' }, { status: 409 });
  }
  await execute('DELETE FROM site_pages WHERE id = ? AND business_id = ?', [body.pageId, body.businessId]);
  return NextResponse.json({ ok: true });
}
