import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { canAccessBusiness, getAdminUser } from '@/lib/admin-auth';
import { queryOne } from '@/lib/db';
import { getBusinessMembership, listBusinessApplications } from '@/lib/business-apps';
import BusinessApplicationsClient from '@/components/BusinessApplicationsClient';

export const dynamic = 'force-dynamic';

export default async function BusinessApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestHeaders = await headers();
  const request = new Request('http://localhost/admin', {
    headers: Object.fromEntries(requestHeaders.entries()),
  });
  const user = await getAdminUser(request);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const membership = await getBusinessMembership(user.id, id);
  if (!membership || membership.status !== 'active' || membership.role !== 'owner') notFound();

  const business = await queryOne<{ name: string; name_ar: string | null }>(
    'SELECT name, name_ar FROM businesses WHERE id = ? AND status = ?',
    [id, 'active'],
  );
  if (!business) notFound();

  const applications = await listBusinessApplications(id);
  return (
    <div className="space-y-6">
      <header className="border-b border-black/10 pb-4">
        <p className="text-sm text-neutral-500">AL Mostashar Auto · application access</p>
        <h1 className="mt-1 text-2xl font-bold">{business.name_ar || business.name}</h1>
      </header>
      <BusinessApplicationsClient businessId={id} initialApplications={applications} />
    </div>
  );
}
