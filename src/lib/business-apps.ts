import { query, queryOne } from '@/lib/db';
import type { AdminUser } from '@/lib/admin-auth';
import { BUSINESS_APPLICATIONS, type BusinessApplicationId } from '@/lib/business-app-catalog';
export { BUSINESS_APPLICATIONS, type BusinessApplicationId } from '@/lib/business-app-catalog';
export type BusinessApplicationStatus =
  | 'not_requested'
  | 'requested'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked';
export type BusinessMemberRole = 'owner' | 'sales' | 'accountant';

export interface BusinessApplicationView {
  id: BusinessApplicationId;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  status: BusinessApplicationStatus;
  startsAt: string | null;
  expiresAt: string | null;
  licenseKey: string | null;
}

export interface BusinessApplicationLicenseRow {
  business_id: string;
  business_name: string;
  business_name_ar: string | null;
  business_slug: string;
  application_id: BusinessApplicationId;
  status: Exclude<BusinessApplicationStatus, 'not_requested'> | null;
  starts_at: string | null;
  expires_at: string | null;
  license_key: string | null;
  updated_at: string | null;
}

export async function getBusinessMembership(
  userId: string,
  businessId: string,
): Promise<{ role: BusinessMemberRole; status: string } | null> {
  return queryOne(
    `SELECT role, status FROM business_memberships
      WHERE admin_user_id = ? AND business_id = ? LIMIT 1`,
    [userId, businessId],
  );
}

export async function listBusinessApplications(
  businessId: string,
): Promise<BusinessApplicationView[]> {
  const rows = await query<{
    application_id: BusinessApplicationId;
    status: BusinessApplicationView['status'] | null;
    starts_at: string | null;
    expires_at: string | null;
    license_key: string | null;
  }>(
    `SELECT application_id, status, starts_at, expires_at, license_key
       FROM business_app_licenses WHERE business_id = ?`,
    [businessId],
  );
  const byId = new Map(rows.map((row) => [row.application_id, row]));
  return BUSINESS_APPLICATIONS.map((application) => {
    const row = byId.get(application.id);
    return {
      ...application,
      status: row?.status ?? 'not_requested',
      startsAt: row?.starts_at ?? null,
      expiresAt: row?.expires_at ?? null,
      licenseKey: row?.license_key ?? null,
    };
  });
}

export async function listPlatformApplicationLicenses(): Promise<BusinessApplicationLicenseRow[]> {
  return query<BusinessApplicationLicenseRow>(
    `SELECT b.id AS business_id, b.name AS business_name, b.name_ar AS business_name_ar,
            b.slug AS business_slug, a.application_id, a.status, a.starts_at,
            a.expires_at, a.license_key, a.updated_at
       FROM business_app_licenses a
       JOIN businesses b ON b.id = a.business_id
      WHERE a.status IN ('requested', 'active', 'suspended', 'expired')
      ORDER BY CASE a.status WHEN 'requested' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
               b.name, a.application_id`,
  );
}

export async function hasBusinessApplicationAccess(
  user: AdminUser,
  businessId: string,
  applicationId: BusinessApplicationId,
): Promise<boolean> {
  if (!BUSINESS_APPLICATIONS.some((application) => application.id === applicationId)) {
    return false;
  }
  if (!user.scope_ids.includes('*') && !user.scope_ids.includes(businessId)) {
    return false;
  }
  const [membership, license] = await Promise.all([
    getBusinessMembership(user.id, businessId),
    queryOne<{ status: string; starts_at: string | null; expires_at: string | null }>(
      `SELECT status, starts_at, expires_at FROM business_app_licenses
        WHERE business_id = ? AND application_id = ?`,
      [businessId, applicationId],
    ),
  ]);
  if (!membership || membership.status !== 'active' || !license || license.status !== 'active') {
    return false;
  }
  const now = new Date();
  if (license.starts_at && new Date(license.starts_at) > now) return false;
  if (license.expires_at && new Date(license.expires_at) <= now) return false;

  if (membership.role === 'owner') return true;
  if (membership.role === 'sales') return applicationId !== 'accounting';
  return applicationId === 'accounting';
}
