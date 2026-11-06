/**
 * /admin/showroom/[id]/inventory — vendor's stock manager.
 *
 * Enhanced with:
 *   - free-text search (title / title_ar) via ?q=
 *   - status filter (available|reserved|sold|rented|inactive|all) via ?status=
 *   - kind filter (new|used|demo|lease_return) via ?kind=
 *   - sort (recent|price_asc|price_desc|year_desc|mileage_asc) via ?sort=
 *   - Edit link that actually goes to the unit editor
 *   - Cross-links to the offers manager and gallery
 *
 * All filters are server-side (searchParams) so the URL is shareable and the
 * page works before hydration. The `unitsBySeller` helper already supports
 * drafts/includeTaken; the client-side filtering here is applied post-query
 * because those fields (status, kind) do not need to bypass includeTaken.
 */
import { headers } from 'next/headers';
import Link from 'next/link';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { queryOne } from '@/lib/db';
import { unitsBySeller, type UnitCard } from '@/lib/units';
import { notFound } from 'next/navigation';

type Params = { params: Promise<{ id: string }> };
interface SP { q?: string; status?: string; kind?: string; sort?: string }

const KIND_LABEL: Record<string, string> = {
  new: 'جديد زيرو', used: 'مستعمل', demo: 'تجريبي', lease_return: 'إرجاع تأجير',
};
const STATUS_LABEL: Record<string, string> = {
  available: 'متاح', reserved: 'محجوز', sold: 'تم البيع', rented: 'مؤجّر', inactive: 'مخفي',
};
const STATUS_TONE: Record<string, string> = {
  sold: 'bg-red-500/10 text-red-600 dark:text-red-400',
  reserved: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  inactive: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  rented: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

function applyFilters(units: UnitCard[], sp: SP): UnitCard[] {
  const q = sp.q?.trim().toLowerCase();
  let out = units;
  if (q) out = out.filter((u) => u.title.toLowerCase().includes(q));
  if (sp.status && sp.status !== 'all') out = out.filter((u) => u.status === sp.status);
  if (sp.kind && sp.kind !== 'all') out = out.filter((u) => u.unitKind === sp.kind);
  const sort = sp.sort ?? 'recent';
  return [...out].sort((a, b) => {
    if (sort === 'price_asc') return (a.priceEgp ?? Infinity) - (b.priceEgp ?? Infinity);
    if (sort === 'price_desc') return (b.priceEgp ?? -Infinity) - (a.priceEgp ?? -Infinity);
    if (sort === 'year_desc') return (b.year ?? 0) - (a.year ?? 0);
    if (sort === 'mileage_asc') return (a.mileageKm ?? Infinity) - (b.mileageKm ?? Infinity);
    return 0; // 'recent' already comes from unitsBySeller
  });
}

export default async function ShowroomInventoryPage({ params, searchParams }: Params & { searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;

  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const showroom = await queryOne<{ id: string; name: string; name_ar: string | null; slug: string }>(
    'SELECT id, name, name_ar, slug FROM businesses WHERE id = ?',
    [id],
  );
  if (!showroom) notFound();

  const all = await unitsBySeller(id, {
    locale: 'ar',
    drafts: true,
    includeTaken: true,
    sort: (sp.sort as 'recent' | 'price_asc' | 'price_desc' | 'mileage_asc' | undefined) ?? 'recent',
  });
  const units = applyFilters(all, sp);

  const inputCls =
    'w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40';

  const qs = new URLSearchParams();
  if (sp.q) qs.set('q', sp.q);
  if (sp.status) qs.set('status', sp.status);
  if (sp.kind) qs.set('kind', sp.kind);
  if (sp.sort) qs.set('sort', sp.sort);
  const qsStr = qs.toString();
  const selfUrl = (over: Record<string, string | undefined>) => {
    const m = new URLSearchParams(qsStr);
    for (const [k, v] of Object.entries(over)) {
      if (!v) m.delete(k); else m.set(k, v);
    }
    const s = m.toString();
    return `/admin/showroom/${id}/inventory${s ? `?${s}` : ''}`;
  };

  return (
    <div dir="rtl" className="space-y-6">
      <nav className="text-xs opacity-60 flex gap-2 items-center flex-wrap">
        <Link href="/admin" className="hover:underline">لوحة التحكم الرئيسية</Link>
        <span>/</span>
        <Link href={`/admin/showroom/${id}`} className="hover:underline">{showroom.name_ar || showroom.name}</Link>
        <span>/</span>
        <span className="font-bold">إدارة مخزون السيارات</span>
        <span className="opacity-40">·</span>
        <Link href={`/admin/showroom/${id}/offers`} className="hover:underline">العروض</Link>
        <span className="opacity-40">·</span>
        <Link href={`/admin/showroom/${id}/gallery`} className="hover:underline">المعرض الصحفي</Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold">
            مخزون سيارات المعرض ({units.length}
            {units.length !== all.length ? <span className="text-base opacity-60"> / {all.length} إجمالي</span> : null})
          </h1>
          <p className="text-xs opacity-60 mt-1">
            جميع السيارات المضافة تظهر تلقائياً على موقع المعرض وبوابة السيارات مع حاسبة التقسيط
          </p>
        </div>
        <Link
          href={`/admin/showroom/${id}/inventory/new`}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>إضافة سيارة جديدة</span>
        </Link>
      </div>

      {/* Filter bar */}
      <form method="GET" className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02]">
        <div className="col-span-2">
          <label className="text-[11px] uppercase font-bold opacity-60 mb-1 block">بحث</label>
          <input name="q" defaultValue={sp.q ?? ''} placeholder="اسم السيارة…" className={inputCls} />
        </div>
        <div>
          <label className="text-[11px] uppercase font-bold opacity-60 mb-1 block">الحالة</label>
          <select name="status" defaultValue={sp.status ?? 'all'} className={inputCls}>
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase font-bold opacity-60 mb-1 block">النوع</label>
          <select name="kind" defaultValue={sp.kind ?? 'all'} className={inputCls}>
            <option value="all">كل الأنواع</option>
            {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase font-bold opacity-60 mb-1 block">الترتيب</label>
          <select name="sort" defaultValue={sp.sort ?? 'recent'} className={inputCls}>
            <option value="recent">الأحدث تحديثاً</option>
            <option value="price_asc">السعر ↑</option>
            <option value="price_desc">السعر ↓</option>
            <option value="year_desc">السنة ↓</option>
            <option value="mileage_asc">أقل كيلومترات</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-5 flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">تطبيق</button>
          <Link href={`/admin/showroom/${id}/inventory`} className="px-4 py-2 rounded-lg border border-black/15 dark:border-white/15 text-sm font-semibold">مسح الفلاتر</Link>
        </div>
      </form>

      {units.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-black/15 rounded-2xl space-y-3">
          <div className="text-4xl">🚗</div>
          <h3 className="font-bold text-base">
            {all.length === 0 ? 'لا توجد سيارات مضافة بعد في هذا المعرض' : 'لا نتائج مطابقة للفلاتر الحالية'}
          </h3>
          {all.length === 0 ? (
            <>
              <p className="text-xs opacity-60 max-w-sm mx-auto">
                ابدأ بإضافة أول سيارة لتظهر في المخزون وتتفعل معها حاسبة التقسيط للزوار
              </p>
              <Link
                href={`/admin/showroom/${id}/inventory/new`}
                className="inline-block mt-2 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-bold"
              >
                + إضافة سيارة الآن
              </Link>
            </>
          ) : (
            <Link href={`/admin/showroom/${id}/inventory`} className="text-sm font-bold hover:underline">مسح الفلاتر</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {units.map((car) => (
            <div
              key={car.id}
              className="p-4 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base">{car.title}</span>
                  {car.year && (
                    <span className="text-xs bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded font-bold">{car.year}</span>
                  )}
                  {car.unitKind && (
                    <span className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                      {KIND_LABEL[car.unitKind] ?? car.unitKind}
                    </span>
                  )}
                  {car.status !== 'available' && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${STATUS_TONE[car.status] ?? 'bg-gray-500/10 text-gray-600'}`}>
                      {STATUS_LABEL[car.status] ?? car.status}
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-60 flex gap-4 flex-wrap">
                  {car.priceEgp ? (
                    <span className="font-semibold text-green-600">السعر: {car.priceEgp.toLocaleString()} {car.currency}</span>
                  ) : null}
                  {car.mileageKm ? <span>كيلومترات: {car.mileageKm.toLocaleString()}</span> : null}
                  <span className="opacity-40 font-mono">{car.href}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={car.href}
                  target="_blank"
                  rel="noopener"
                  className="text-xs px-3 py-1.5 rounded-lg border border-black/15 hover:bg-black/5 font-semibold"
                >
                  معاينة ↗
                </Link>
                <Link
                  href={`/admin/showroom/${id}/inventory/${car.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold"
                >
                  تعديل
                </Link>
                <a
                  href={selfUrl({ status: 'sold', kind: undefined })}
                  className="text-[10px] px-2 py-1 rounded opacity-0 pointer-events-none" aria-hidden
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
