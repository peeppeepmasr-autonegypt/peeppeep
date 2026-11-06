/**
 * /admin/showroom/[id]/content — Content Studio
 *
 * Server component that loads the business, its sections, fields, gallery,
 * and blogs, then hands the data to the client ContentStudioClient.
 */
import { headers } from 'next/headers';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { loadContentStudioData, attachPermissions } from '@/lib/content-admin';
import { notFound } from 'next/navigation';
import ContentStudioClient from '@/components/ContentStudioClient';

type Params = { params: Promise<{ id: string }> };

export default async function ContentStudioPage({ params }: Params) {
  const { id } = await params;

  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const data = await loadContentStudioData(id);
  if (!data) notFound();

  attachPermissions(data, user);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs opacity-60 flex gap-2">
        <a href="/admin" className="hover:underline">Admin</a>
        <span>/</span>
        <a href={`/admin/showroom/${id}`} className="hover:underline">
          {data.business.name_ar || data.business.name}
        </a>
        <span>/</span>
        <span>Content Studio</span>
      </nav>

      {/* Page header */}
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
        <div>
          <h1 className="text-xl font-bold">Content Studio</h1>
          <p className="text-xs opacity-50 mt-0.5">
            Manage sections, gallery, carousel, field values, and blog for {data.business.name}
          </p>
        </div>
        <a
          href={`/${data.business.slug}`}
          target="_blank"
          rel="noopener"
          className="text-xs px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/20 font-bold hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          Preview minisite ↗
        </a>
      </div>

      {/* Client interactive studio */}
      <ContentStudioClient initialData={data} businessId={id} />
    </div>
  );
}
