import { NextRequest, NextResponse } from 'next/server';
import { canAccessBusiness, getAdminUser } from '@/lib/admin-auth';
import { batch } from '@/lib/db';
import {
  BUSINESS_APPLICATIONS,
  listBusinessApplications,
  getBusinessMembership,
  type BusinessApplicationId,
} from '@/lib/business-apps';

export const runtime = 'edge';

async function authorizeOwner(request: Request, businessId: string) {
  const user = await getAdminUser(request);
  if (!user || !canAccessBusiness(user, businessId)) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  const membership = await getBusinessMembership(user.id, businessId);
  if (!membership || membership.status !== 'active' || membership.role !== 'owner') {
    return { response: NextResponse.json({ error: 'business owner access required' }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId')?.trim() ?? '';
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
  try {
    const auth = await authorizeOwner(request, businessId);
    if ('response' in auth) return auth.response;
    return NextResponse.json({ applications: await listBusinessApplications(businessId) });
  } catch (error) {
    console.error('Could not load business applications:', error);
    return NextResponse.json({ error: 'Could not load application licenses.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { businessId?: string; applicationIds?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
  if (!businessId || !Array.isArray(body.applicationIds) || body.applicationIds.length === 0) {
    return NextResponse.json({ error: 'businessId and applicationIds are required' }, { status: 400 });
  }
  const applicationIds = [...new Set(body.applicationIds)];
  if (applicationIds.some((id) =>
    typeof id !== 'string' || !BUSINESS_APPLICATIONS.some((application) => application.id === id),
  )) {
    return NextResponse.json({ error: 'unsupported application' }, { status: 400 });
  }

  try {
    const auth = await authorizeOwner(request, businessId);
    if ('response' in auth) return auth.response;
    const now = new Date().toISOString();
    await batch(applicationIds.map((applicationId) => ({
      sql: `INSERT INTO business_app_licenses (id, business_id, application_id, status, updated_at)
            VALUES (?, ?, ?, 'requested', ?)
            ON CONFLICT(business_id, application_id) DO UPDATE SET
              status = 'requested', updated_by = NULL, updated_at = excluded.updated_at
            WHERE status IN ('revoked', 'expired')`,
      params: [
        `app_${businessId}_${applicationId}`,
        businessId,
        applicationId as BusinessApplicationId,
        now,
      ],
    })));
    return NextResponse.json({ applications: await listBusinessApplications(businessId) });
  } catch (error) {
    console.error('Could not request application licenses:', error);
    return NextResponse.json({ error: 'Could not submit application request.' }, { status: 500 });
  }
}
