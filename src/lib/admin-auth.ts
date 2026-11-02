/**
 * Admin authorization helper.
 *
 * Authentication is handled by Cloudflare Access at the edge — by the time a
 * request reaches this code, Access has already verified the user's identity
 * and injected the `Cf-Access-Authenticated-User-Email` header. We trust that
 * header (it is stripped and re-injected by the Access proxy; a direct request
 * bypassing Access never carries it unless the shared secret matches, which
 * only Access knows).
 *
 * This module is only about AUTHORIZATION: given the verified email, does this
 * user have the right to act on a given business? The answer lives in D1.
 */
import { queryOne } from '@/lib/db';

export interface AdminUser {
  id: string;
  email: string;
  role: 'platform_admin' | 'vendor';
  scope_ids: string[];   // ['*'] means unrestricted
  active: number;
}

/**
 * Load the admin user for the email Cloudflare Access asserted.
 * Returns null when the email is unknown or the account is inactive.
 */
export async function getAdminUser(request: Request): Promise<AdminUser | null> {
  const email = request.headers.get('cf-access-authenticated-user-email');
  if (!email) return null;

  const row = await queryOne<{ id: string; email: string; role: string; scope_ids: string; active: number }>(
    'SELECT id, email, role, scope_ids, active FROM admin_users WHERE email = ? AND active = 1',
    [email],
  );
  if (!row) return null;

  let scope_ids: string[] = [];
  try { scope_ids = JSON.parse(row.scope_ids) as string[]; } catch { /* keep empty */ }

  return {
    id: row.id,
    email: row.email,
    role: row.role as AdminUser['role'],
    scope_ids,
    active: row.active,
  };
}

/**
 * Check whether an admin user may act on a specific business id.
 * Platform admins pass unconditionally; vendors need the id in their scope list.
 */
export function canAccessBusiness(user: AdminUser, businessId: string): boolean {
  if (user.role === 'platform_admin') return true;
  return user.scope_ids.includes('*') || user.scope_ids.includes(businessId);
}

/** Convenience: load user + check business access in one call. */
export async function requireBusinessAccess(
  request: Request,
  businessId: string,
): Promise<{ user: AdminUser } | Response> {
  const user = await getAdminUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!canAccessBusiness(user, businessId)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  return { user };
}

/** Convenience: require platform_admin role. */
export async function requirePlatformAdmin(
  request: Request,
): Promise<{ user: AdminUser } | Response> {
  const user = await getAdminUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (user.role !== 'platform_admin') {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  return { user };
}
