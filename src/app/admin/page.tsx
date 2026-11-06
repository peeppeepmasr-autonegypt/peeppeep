import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function AdminHome() {
  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user) redirect('/');

  // Fetch scoped businesses
  let businesses: { id: string; name: string; name_ar: string | null; slug: string; type_id: string }[] = [];

  if (user.role === 'platform_admin' || user.scope_ids.includes('*')) {
    businesses = await query(
      `SELECT id, name, name_ar, slug, type_id FROM businesses
        WHERE parent_business_id IS NULL AND status = 'active' ORDER BY name`,
    );
  } else if (user.scope_ids.length) {
    const ph = user.scope_ids.map(() => '?').join(',');
    businesses = await query(
      `SELECT id, name, name_ar, slug, type_id FROM businesses
        WHERE id IN (${ph}) AND status = 'active' ORDER BY name`,
      user.scope_ids,
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex justify-between items-center border-b border-black/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold">لوحة تحكم المنصة والمعارض</h1>
          <p className="opacity-60 text-xs mt-1">مرحباً بك: {user.email}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold opacity-75">المعارض والشركات المتاحة</h2>
        {businesses.length === 0 ? (
          <p className="opacity-60 text-sm">لا توجد معارض مسجلة حالياً.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {businesses.map((b) => (
              <a
                key={b.id}
                href={`/admin/showroom/${b.id}`}
                className="block rounded-xl border border-black/10 dark:border-white/15 p-5 hover:bg-black/[.03] dark:hover:bg-white/[.05] transition shadow-sm"
              >
                <div className="text-[11px] font-bold text-blue-600 mb-1">
                  {b.type_id === 'showroom' ? 'معرض سيارات' : b.type_id}
                </div>
                <div className="text-lg font-bold">{b.name_ar || b.name}</div>
                {b.name_ar && <div className="text-xs opacity-50 mt-0.5">{b.name}</div>}
                <div className="text-xs text-blue-500 mt-3 font-semibold flex items-center gap-1">
                  <span>إدارة المعرض والسيارات</span>
                  <span>←</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
