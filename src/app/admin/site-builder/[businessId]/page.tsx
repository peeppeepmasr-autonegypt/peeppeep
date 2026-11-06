import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { queryOne } from '@/lib/db';
import { listSitePages } from '@/lib/site-pages';
import SitePageBuilderClient from '@/components/SitePageBuilderClient';

export default async function SitePageBuilder({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const requestHeaders = await headers();
  const request = new Request('http://localhost/admin/site-builder', {
    headers: Object.fromEntries(requestHeaders.entries()),
  });
  const user = await getAdminUser(request);
  if (!user || !canAccessBusiness(user, businessId)) notFound();

  const business = await queryOne<{
    id: string;
    name: string;
    name_ar: string | null;
    slug: string;
    type_id: string;
  }>(
    `SELECT id, name, name_ar, slug, type_id FROM businesses
      WHERE id = ? AND status = 'active' AND type_id IN ('vehicle_brand', 'vehicle_model')`,
    [businessId],
  );
  if (!business) notFound();

  const pages = await listSitePages(businessId);
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-xs opacity-60">
        <Link href="/admin" className="hover:underline">Admin</Link>
        <span>/</span>
        <Link href="/admin/site-builder" className="hover:underline">Site Builder</Link>
        <span>/</span>
        <span>{business.name_ar || business.name}</span>
      </nav>
      <header className="border-b border-black/10 pb-4">
        <h1 className="text-2xl font-bold">{business.name_ar || business.name} · Page Builder</h1>
        <p className="mt-1 text-sm opacity-60">
          Manage the main {business.type_id === 'vehicle_brand' ? 'make' : 'model'} page and create separate update pages.
          Each page has a required hero carousel, reusable automotive components, and its own publishable layout.
        </p>
      </header>
      <SitePageBuilderClient
        businessId={business.id}
        businessName={business.name}
        businessSlug={business.slug}
        initialPages={pages}
      />
    </div>
  );
}
