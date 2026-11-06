import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { listPlatformApplicationLicenses } from '@/lib/business-apps';
import PlatformApplicationLicensesClient from '@/components/PlatformApplicationLicensesClient';

export const dynamic = 'force-dynamic';

export default async function PlatformBusinessApplicationsPage() {
  const requestHeaders = await headers();
  const request = new Request('http://localhost/admin/platform/business-applications', {
    headers: Object.fromEntries(requestHeaders.entries()),
  });
  const user = await getAdminUser(request);
  if (!user || user.role !== 'platform_admin') notFound();

  const licenses = await listPlatformApplicationLicenses();
  return (
    <div className="space-y-6">
      <header className="border-b border-black/10 pb-4">
        <p className="text-sm text-neutral-500">Autofyon platform control</p>
        <h1 className="mt-1 text-2xl font-bold">AL Mostashar Auto application licenses</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Only active licenses pass the application-access check. Activation records licensing state; it does not imply an unfinished application has been integrated.
        </p>
      </header>
      <PlatformApplicationLicensesClient initialLicenses={licenses} />
    </div>
  );
}
