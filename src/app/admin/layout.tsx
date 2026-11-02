/**
 * Admin layout — English, LTR, gated by Cloudflare Access.
 *
 * Cloudflare Access is enforced at the edge and passes
 * `Cf-Access-Authenticated-User-Email` on every authenticated request.
 * This layout double-checks that the email exists in admin_users; if not,
 * it renders an access-denied page rather than the dashboard.
 *
 * All admin pages are English-only (operator-facing).
 */
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import HtmlShell from '@/components/HtmlShell';

export const metadata = { title: 'AutoPortal Admin' };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Build a minimal Request-like object from Next.js headers for getAdminUser.
  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });

  const user = await getAdminUser(fakeReq);

  if (!user) {
    return (
      <HtmlShell locale="en">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-sm text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h1 className="text-xl font-semibold">Access Denied</h1>
            <p className="opacity-70 text-sm">
              Your account is not authorised to access the AutoPortal dashboard.
              Contact your administrator to be granted access.
            </p>
          </div>
        </div>
      </HtmlShell>
    );
  }

  return (
    <HtmlShell locale="en">
      <div className="min-h-screen flex flex-col">
        {/* Top nav bar */}
        <header className="border-b border-black/10 dark:border-white/10 px-6 py-3 flex items-center gap-4">
          <a href="/admin" className="font-bold text-lg">AutoPortal</a>
          <span className="opacity-40 text-sm">|</span>
          <span className="text-sm opacity-70">
            {user.role === 'platform_admin' ? '⚙️ Platform Admin' : '🏢 Vendor'}
          </span>
          <span className="ms-auto text-xs opacity-50">{user.email}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </HtmlShell>
  );
}
