/**
 * /api/admin/content
 *
 * GET  ?business_id=X         → full ContentStudioData (sections, fields, values, gallery, blogs)
 * PATCH { business_id, section_id, values } → merge values into custom_data[section_id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/admin-auth';
import { loadContentStudioData, attachPermissions, saveSectionValues } from '@/lib/content-admin';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('business_id');
  if (!businessId) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
  }

  const auth = await requireBusinessAccess(req, businessId);
  if (auth instanceof Response) return auth;

  const data = await loadContentStudioData(businessId);
  if (!data) {
    return NextResponse.json({ error: 'business not found' }, { status: 404 });
  }

  attachPermissions(data, auth.user);
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  let body: { business_id?: string; section_id?: string; values?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { business_id, section_id, values } = body;
  if (!business_id || !section_id || !values) {
    return NextResponse.json({ error: 'business_id, section_id and values are required' }, { status: 400 });
  }

  const auth = await requireBusinessAccess(req, business_id);
  if (auth instanceof Response) return auth;

  try {
    await saveSectionValues(business_id, section_id, values);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'save failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
