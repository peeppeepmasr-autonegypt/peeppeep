/**
 * /admin/showroom/[id]/inventory/[unitId] — the vendor unit edit page.
 *
 * Server shell: authenticates, loads the raw unit row (only if the current
 * admin can access the seller), renders the client <UnitEditForm />. The API
 * enforces the same guard on PATCH/DELETE, so a stale link cannot smuggle an
 * edit through — this page just refuses to draw it.
 */
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { queryOne } from '@/lib/db';
import UnitEditForm, { type EditableUnit } from '@/components/UnitEditForm';

type Params = { params: Promise<{ id: string; unitId: string }> };

export default async function AdminUnitEditPage({ params }: Params) {
  const { id, unitId } = await params;

  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const unit = await queryOne<EditableUnit & { seller_business_id: string }>(
    `SELECT id, slug, title, title_ar, unit_kind, vehicle_category, status, year, mileage_km, vin,
            color, color_ar, price_egp, price_currency, negotiable, published,
            model_business_id, trim_business_id, overrides, seller_business_id
       FROM units WHERE id = ?`,
    [unitId],
  );
  if (!unit || unit.seller_business_id !== id) notFound();

  return (
    <div dir="rtl" className="space-y-6 max-w-4xl">
      <nav className="text-xs opacity-60 flex gap-2 flex-wrap">
        <Link href="/admin" className="hover:underline">لوحة التحكم</Link>
        <span>/</span>
        <Link href={`/admin/showroom/${id}`} className="hover:underline">المعرض</Link>
        <span>/</span>
        <Link href={`/admin/showroom/${id}/inventory`} className="hover:underline">المخزون</Link>
        <span>/</span>
        <span className="font-bold">{unit.title_ar || unit.title}</span>
      </nav>

      <header className="border-b border-black/10 dark:border-white/10 pb-3">
        <h1 className="text-2xl font-bold">تعديل سيارة</h1>
        <div className="text-xs opacity-60 mt-1">
          slug: <span className="font-mono">{unit.slug}</span>
          {' · '}
          <Link href={`/u/${unit.slug}`} target="_blank" className="hover:underline">معاينة عامة ↗</Link>
          {' · '}
          <Link href={`/admin/showroom/${id}/inventory/${unitId}/content`} className="hover:underline">إدارة الصور والكاروسيل</Link>
        </div>
      </header>

      <UnitEditForm unit={unit} showroomId={id} />
    </div>
  );
}
