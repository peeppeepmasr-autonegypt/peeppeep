import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { query } from '@/lib/db';
import { SITE_TEMPLATES } from '@/lib/site-builder';
import SiteBuilderClient, { type SiteBuilderTarget } from '@/components/SiteBuilderClient';

export default async function SiteBuilderPage() {
  const requestHeaders = await headers();
  const request = new Request('http://localhost/admin/site-builder', {
    headers: Object.fromEntries(requestHeaders.entries()),
  });
  const user = await getAdminUser(request);
  if (!user) notFound();

  const [businesses, units, profiles] = await Promise.all([
    query<{
      id: string; name: string; name_ar: string | null; slug: string; type_id: string; published: number;
    }>(
      `SELECT id, name, name_ar, slug, type_id, published
         FROM businesses
        WHERE status = 'active'
          AND type_id IN ('vehicle_brand', 'vehicle_model', 'vehicle_trim',
            'showroom', 'main_agency', 'distributor', 'used_car_dealer',
            'agent_broker', 'service_center', 'spare_parts', 'accessories_detailing')
        ORDER BY type_id, name`,
    ),
    query<{
      id: string; title: string; title_ar: string | null; slug: string; published: number;
      seller_business_id: string; seller_slug: string;
    }>(
      `SELECT u.id, u.title, u.title_ar, u.slug, u.published, u.seller_business_id, s.slug AS seller_slug
         FROM units u
         JOIN businesses s ON s.id = u.seller_business_id
        WHERE u.status <> 'inactive'
        ORDER BY u.updated_at DESC`,
    ),
    query<{
      target_type: string; target_id: string; template_id: string;
      logo_url: string | null; accent_color: string | null; background_color: string | null;
    }>('SELECT target_type, target_id, template_id, logo_url, accent_color, background_color FROM site_profiles'),
  ]);
  const profileMap = new Map(profiles.map((profile) => [`${profile.target_type}:${profile.target_id}`, profile]));

  const targets: SiteBuilderTarget[] = [];
  for (const business of businesses) {
    if (!canAccessBusiness(user, business.id)) continue;
    const profile = profileMap.get(`business:${business.id}`);
    targets.push({
      id: business.id,
      targetType: 'business',
      name: business.name_ar || business.name,
      kind: business.type_id.replaceAll('_', ' '),
      previewUrl: business.published ? `/${business.slug}` : null,
      isPublished: business.published === 1,
      contentUrl: `/admin/showroom/${business.id}/content`,
      pageBuilderUrl: ['vehicle_brand', 'vehicle_model'].includes(business.type_id)
        ? `/admin/site-builder/${business.id}`
        : undefined,
      editUrl: `/admin/showroom/${business.id}`,
      templateId: profile?.template_id ?? null,
      logoUrl: profile?.logo_url ?? null,
      accentColor: profile?.accent_color ?? null,
      backgroundColor: profile?.background_color ?? null,
    });
  }
  for (const unit of units) {
    if (!canAccessBusiness(user, unit.seller_business_id)) continue;
    const profile = profileMap.get(`unit:${unit.id}`);
    targets.push({
      id: unit.id,
      targetType: 'unit',
      name: unit.title_ar || unit.title,
      kind: 'vehicle listing',
      previewUrl: unit.published ? `/${unit.seller_slug}/u/${unit.slug}` : null,
      isPublished: unit.published === 1,
      contentUrl: `/admin/showroom/${unit.seller_business_id}/inventory/${unit.id}/content`,
      sharedContentUrl: `/admin/showroom/${unit.seller_business_id}/content`,
      editUrl: `/admin/showroom/${unit.seller_business_id}/inventory/${unit.id}`,
      templateId: profile?.template_id ?? null,
      logoUrl: profile?.logo_url ?? null,
      accentColor: profile?.accent_color ?? null,
      backgroundColor: profile?.background_color ?? null,
    });
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-xs opacity-60">
        <Link href="/admin" className="hover:underline">Admin</Link>
        <span>/</span>
        <span>Site Builder</span>
      </nav>
      <header className="border-b border-black/10 pb-4">
        <h1 className="text-2xl font-bold">Site Builder</h1>
        <p className="mt-1 text-sm opacity-60">Prepare vendor, model, and vehicle pages with reusable visual presets. Manage published content, carousels, and blogs from each page’s studio.</p>
      </header>
      {user.role === 'platform_admin' ? (
        <Link href="/admin/platform/blog" className="inline-flex rounded-lg border border-black/10 px-4 py-2 text-sm font-bold hover:bg-black/[.03]">
          Manage the global blog ↗
        </Link>
      ) : null}
      <SiteBuilderClient targets={targets} templates={SITE_TEMPLATES} />
    </div>
  );
}
