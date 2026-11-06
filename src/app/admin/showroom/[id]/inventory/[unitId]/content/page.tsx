import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { loadContentStudioData, attachPermissions, type StudioGalleryItem } from '@/lib/content-admin';
import { parseJson, query, queryOne } from '@/lib/db';
import VehicleContentStudio from '@/components/VehicleContentStudio';

export default async function VehicleContentPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  const requestHeaders = await headers();
  const request = new Request('http://localhost/admin', {
    headers: Object.fromEntries(requestHeaders.entries()),
  });
  const user = await getAdminUser(request);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const unit = await queryOne<{
    id: string; title: string; title_ar: string | null; slug: string;
    seller_business_id: string; model_business_id: string | null;
  }>(
    'SELECT id, title, title_ar, slug, seller_business_id, model_business_id FROM units WHERE id = ?',
    [unitId],
  );
  if (!unit || unit.seller_business_id !== id) notFound();

  const content = await loadContentStudioData(unit.model_business_id ?? id);
  if (!content) notFound();
  attachPermissions(content, user);
  const sections = content.sections.filter((section) => section.enable_gallery === 1);
  const galleryRows = await query<Omit<StudioGalleryItem, 'media_data'> & { section_id: string; media_data: string | null }>(
    `SELECT id, section_id, url, caption, caption_ar, media_data, group_key,
            field_key, field_section_id, display_order, placement, is_hero,
            show_on_minisite, approval_status, media_type, video_id
       FROM vendor_gallery
      WHERE business_id = ? AND unit_id = ?
      ORDER BY section_id, display_order`,
    [id, unitId],
  );
  const initialGallery: Record<string, StudioGalleryItem[]> = {};
  for (const row of galleryRows) {
    const { section_id, media_data, ...item } = row;
    (initialGallery[section_id] ??= []).push({
      ...item,
      media_data: parseJson<Record<string, unknown> | null>(media_data, null),
    });
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-xs opacity-60">
        <Link href="/admin" className="hover:underline">Admin</Link><span>/</span>
        <Link href={`/admin/showroom/${id}`} className="hover:underline">Vendor site</Link><span>/</span>
        <Link href={`/admin/showroom/${id}/inventory`} className="hover:underline">Inventory</Link><span>/</span>
        <span>Vehicle site</span>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Vehicle site content</h1>
          <p className="mt-1 text-sm opacity-60">{unit.title_ar || unit.title}</p>
        </div>
        <Link href={`/${content.business.slug}`} target="_blank" rel="noreferrer" className="text-sm font-bold hover:underline">Preview model page ↗</Link>
      </header>
      <VehicleContentStudio
        sellerId={id}
        unitId={unitId}
        sections={sections}
        fields={content.fields}
        initialGallery={initialGallery}
        permissions={content.permissions}
      />
      <p className="text-xs opacity-60">
        Blogs and shared model details are managed from the associated vendor/model Content Studio. This editor is for media belonging to this individual vehicle.
      </p>
      <Link href={`/admin/showroom/${id}/inventory/${unitId}`} className="text-sm font-bold hover:underline">Edit vehicle price, condition, and specifications →</Link>
    </div>
  );
}
