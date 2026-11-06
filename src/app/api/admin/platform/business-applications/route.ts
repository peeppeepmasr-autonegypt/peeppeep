import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { execute, queryOne } from '@/lib/db';
import {
  BUSINESS_APPLICATIONS,
  listPlatformApplicationLicenses,
  type BusinessApplicationId,
} from '@/lib/business-apps';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user || user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'platform admin required' }, { status: 403 });
  }
  try {
    return NextResponse.json({ licenses: await listPlatformApplicationLicenses() });
  } catch (error) {
    console.error('Could not load platform application licenses:', error);
    return NextResponse.json({ error: 'Could not load application licenses.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getAdminUser(request);
  if (!user || user.role !== 'platform_admin') {
    return NextResponse.json({ error: 'platform admin required' }, { status: 403 });
  }

  let body: {
    businessId?: string;
    applicationId?: string;
    status?: string;
    licenseKey?: string | null;
    expiresAt?: string | null;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { businessId, applicationId, status } = body;
  if (!businessId || !applicationId || !status) {
    return NextResponse.json({ error: 'businessId, applicationId and status are required' }, { status: 400 });
  }
  if (!BUSINESS_APPLICATIONS.some((application) => application.id === applicationId)) {
    return NextResponse.json({ error: 'unsupported application' }, { status: 400 });
  }
  if (!['active', 'suspended', 'revoked'].includes(status)) {
    return NextResponse.json({ error: 'status must be active, suspended or revoked' }, { status: 400 });
  }
  const licenseKey = body.licenseKey?.trim() || null;
  if (licenseKey && licenseKey.length > 120) {
    return NextResponse.json({ error: 'licenseKey must be under 120 characters' }, { status: 400 });
  }
  const expiresAt = body.expiresAt?.trim() || null;
  if (expiresAt && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) {
    return NextResponse.json({ error: 'expiresAt must be a future date' }, { status: 400 });
  }

  try {
    const business = await queryOne<{ id: string }>(
      'SELECT id FROM businesses WHERE id = ? AND status = ?',
      [businessId, 'active'],
    );
    if (!business) return NextResponse.json({ error: 'business not found' }, { status: 404 });

    const now = new Date().toISOString();
    await execute(
      `INSERT INTO business_app_licenses
         (id, business_id, application_id, status, license_key, starts_at, expires_at, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(business_id, application_id) DO UPDATE SET
         status = excluded.status,
         license_key = excluded.license_key,
         starts_at = CASE WHEN excluded.status = 'active' THEN excluded.starts_at ELSE starts_at END,
         expires_at = excluded.expires_at,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
      [
        `app_${businessId}_${applicationId as BusinessApplicationId}`,
        businessId,
        applicationId,
        status,
        licenseKey,
        status === 'active' ? now : null,
        expiresAt,
        user.id,
        now,
      ],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Could not update application license:', error);
    return NextResponse.json({ error: 'Could not update application license.' }, { status: 500 });
  }
}
