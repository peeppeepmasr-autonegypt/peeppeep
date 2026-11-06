/**
 * Admin authorization helper.
 *
 * In production / with direct login:
 *   - Checks cookie `admin_session` (set by /almostashar login)
 *   - Or checks Cloudflare Access header `Cf-Access-Authenticated-User-Email`
 *   - Fallback to super admin for testing / local dev.
 */
import { queryOne, execute } from '@/lib/db';
import { verifyAdminSession } from '@/lib/admin-session';

export interface AdminUser {
  id: string;
  email: string;
  role: 'platform_admin' | 'vendor';
  scope_ids: string[];   // ['*'] means unrestricted
  active: number;
}

export const SUPER_ADMIN_EMAIL = 'super@mostasharak.com';
export const SUPER_ADMIN_PASS = 'admin123';

/**
 * Load the admin user based on session cookie, Cloudflare header, or dev fallback.
 */
export async function getAdminUser(request: Request): Promise<AdminUser | null> {
  let email = request.headers.get('cf-access-authenticated-user-email');

  // Check admin session cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  if (match) {
    email = await verifyAdminSession(match[1]) ?? email;
  }

  // Ensure super@mostasharak.com exists in admin_users
  try {
    await execute(
      `INSERT OR REPLACE INTO admin_users (id, email, name, role, scope_ids, active)
       VALUES ('usr_super_admin', ?, 'المستشار - Super Admin', 'platform_admin', '["*"]', 1)`,
      [SUPER_ADMIN_EMAIL]
    );
  } catch {
    // ignore if locked
  }

  // Local development fallback: if no email identified, default to super admin
  const isLocal =
    process.env.NODE_ENV !== 'production' ||
    (request.headers.get('host') || '').includes('localhost') ||
    (request.headers.get('host') || '').includes('127.0.0.1');

  if (!email && isLocal) {
    email = SUPER_ADMIN_EMAIL;
  }

  if (!email) return null;

  const row = await queryOne<{ id: string; email: string; role: string; scope_ids: string; active: number }>(
    'SELECT id, email, role, scope_ids, active FROM admin_users WHERE email = ? AND active = 1',
    [email],
  );
  if (!row) {
    // If it's super admin but wasn't found, return default platform admin
    if (email === SUPER_ADMIN_EMAIL) {
      return {
        id: 'usr_super_admin',
        email: SUPER_ADMIN_EMAIL,
        role: 'platform_admin',
        scope_ids: ['*'],
        active: 1,
      };
    }
    return null;
  }

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
  if (!user || user.role !== 'platform_admin') {
    return new Response(JSON.stringify({ error: 'forbidden: platform admin required' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  return { user };
}
