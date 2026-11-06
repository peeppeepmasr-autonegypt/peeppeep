/**
 * /admin/showroom/[id]/offers — vendor offers management.
 *
 * Server shell loads the seller's current offers (via `listOffersBySeller`)
 * and the pool of model nodes they can claim against. A seller can only
 * publish an offer for models the portal has registered — inventing a new
 * model at offer time would fight the typology, so this screen only lets you
 * pick from existing `vehicle_model` businesses.
 */
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { query, queryOne } from '@/lib/db';
import { listOffersBySeller } from '@/lib/units';
import OffersManagerClient, { type OfferRow, type ModelOption } from '@/components/OffersManagerClient';

type Params = { params: Promise<{ id: string }> };

const AUTHORITY_OF_TYPE: Record<string, string> = {
  main_agency: 'agency_official',
  distributor: 'distributor',
  showroom: 'dealer',
  used_car_dealer: 'dealer',
  agent_broker: 'broker',
};

export default async function ShowroomOffersPage({ params }: Params) {
  const { id } = await params;

  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const seller = await queryOne<{ id: string; type_id: string; name: string; name_ar: string | null }>(
    'SELECT id, type_id, name, name_ar FROM businesses WHERE id = ?',
    [id],
  );
  if (!seller) notFound();

  const [rows, models] = await Promise.all([
    listOffersBySeller(id) as Promise<OfferRow[]>,
    query<ModelOption>(
      `SELECT id, slug, name, name_ar FROM businesses
        WHERE type_id = 'vehicle_model' AND published = 1 AND status = 'active'
        ORDER BY COALESCE(name_ar, name)`,
    ),
  ]);

  const hint = AUTHORITY_OF_TYPE[seller.type_id] ?? '—';

  return (
    <div dir="rtl" className="space-y-6">
      <nav className="text-xs opacity-60 flex gap-2 flex-wrap">
        <Link href="/admin" className="hover:underline">لوحة التحكم</Link>
        <span>/</span>
        <Link href={`/admin/showroom/${id}`} className="hover:underline">{seller.name_ar || seller.name}</Link>
        <span>/</span>
        <span className="font-bold">إدارة العروض</span>
      </nav>

      <header className="border-b border-black/10 dark:border-white/10 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">عروض الموديلات</h1>
          <p className="text-xs opacity-60 mt-1">
            تسعير رسمي على مستوى الموديل — يقرأه الزائر داخل صفحة الموديل ويصنّف حسب الصلاحية.
          </p>
        </div>
      </header>

      <OffersManagerClient
        initial={rows}
        models={models}
        sellerBusinessId={id}
        sellerAuthorityHint={hint}
      />
    </div>
  );
}
