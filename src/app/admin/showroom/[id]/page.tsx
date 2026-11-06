import { headers } from 'next/headers';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { queryOne } from '@/lib/db';
import { notFound } from 'next/navigation';

type Params = { params: Promise<{ id: string }> };

export default async function ShowroomDashboard({ params }: Params) {
  const { id } = await params;

  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const showroom = await queryOne<{
    id: string; name: string; name_ar: string | null; slug: string;
    type_id: string; custom_data: string;
  }>(
    'SELECT id, name, name_ar, slug, type_id, custom_data FROM businesses WHERE id = ? AND status = \'active\'',
    [id],
  );
  if (!showroom) notFound();

  // Count units in stock (since 0009, a car is a row in `units`)
  const listingCount = await queryOne<{ n: number }>(
    'SELECT COUNT(*) AS n FROM units WHERE seller_business_id = ? AND status <> \'inactive\'',
    [id],
  );

  // Count gallery images
  const galleryCount = await queryOne<{ n: number }>(
    'SELECT COUNT(*) AS n FROM vendor_gallery WHERE business_id = ?',
    [id],
  );

  return (
    <div dir="rtl" className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <div className="text-xs font-bold text-blue-600 mb-1">لوحة تحكم المعرض</div>
          <h1 className="text-2xl font-bold">{showroom.name_ar || showroom.name}</h1>
          {showroom.name_ar && <div className="text-xs opacity-50 mt-0.5">{showroom.name}</div>}
        </div>
        <a
          href={`/${showroom.slug}`}
          target="_blank"
          rel="noopener"
          className="text-xs px-3 py-2 rounded-lg border border-black/15 font-bold hover:bg-black/5"
        >
          معاينة موقع المعرض للجمهور ↗
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href={`/admin/showroom/${id}/inventory`}
          className="rounded-xl border border-black/10 p-5 text-center hover:bg-black/[.02] transition shadow-sm"
        >
          <div className="text-4xl font-extrabold text-blue-600">{listingCount?.n ?? 0}</div>
          <div className="text-xs font-bold opacity-70 mt-1">سيارات معروضة بالمخزون</div>
        </a>
        <a
          href={`/admin/showroom/${id}/gallery`}
          className="rounded-xl border border-black/10 p-5 text-center hover:bg-black/[.02] transition shadow-sm"
        >
          <div className="text-4xl font-extrabold text-purple-600">{galleryCount?.n ?? 0}</div>
          <div className="text-xs font-bold opacity-70 mt-1">صور في الأستوديو</div>
        </a>
      </div>

      {/* Main Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold opacity-70">إدارة المعرض</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <a
            href={`/admin/showroom/${id}/content`}
            className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition"
          >
            <span className="text-2xl">🎨</span>
            <div>
              <div className="font-bold text-sm text-emerald-600">Content Studio</div>
              <div className="text-xs opacity-60">أقسام، صور، كاروسيل، بلوج</div>
            </div>
          </a>

          <a
            href={`/admin/showroom/${id}/inventory/new`}
            className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition"
          >
            <span className="text-2xl">🚗</span>
            <div>
              <div className="font-bold text-sm text-blue-600">+ إضافة سيارة جديدة</div>
              <div className="text-xs opacity-60">تحديد السعر والمواصفات وحاسبة التقسيط</div>
            </div>
          </a>

          <a
            href={`/admin/showroom/${id}/gallery`}
            className="flex items-center gap-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition"
          >
            <span className="text-2xl">📸</span>
            <div>
              <div className="font-bold text-sm text-purple-600">رفع صور من الموبايل</div>
              <div className="text-xs opacity-60">فتح الكاميرا وضغط الصور تلقائياً</div>
            </div>
          </a>

          <a
            href={`/admin/showroom/${id}/applications`}
            className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition"
          >
            <span className="text-2xl">🔐</span>
            <div>
              <div className="font-bold text-sm text-amber-700">تراخيص التطبيقات</div>
              <div className="text-xs opacity-60">CRM، السوق، والمحاسبة اختيارية</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
