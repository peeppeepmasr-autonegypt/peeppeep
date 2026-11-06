import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { query } from '@/lib/db';
import TaxonomyFeedModal from '@/components/TaxonomyFeedModal';
import RegistryTriggerButton from '@/components/RegistryTriggerButton';
import TopologyTreeView from '@/components/TopologyTreeView';
import RelationshipManager from '@/components/RelationshipManager';
import SetupPanelClient from '@/components/SetupPanelClient';
import { allowedRelationTypes } from '@/lib/topology';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// ── Shared types (mirrored in child components) ────────────────────────────────

interface BizRow {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  type_id: string;
  custom_domain: string | null;
  parent_business_id: string | null;
}

interface TreeNode {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  type_id: string;
  custom_domain: string | null;
  edge_count: number;
  children: TreeNode[];
}

interface Relationship {
  id: string;
  relation_type: string;
  is_primary: number;
  from_id: string;
  from_name: string;
  from_name_ar: string | null;
  from_type: string;
  to_id: string;
  to_name: string;
  to_name_ar: string | null;
  to_type: string;
  created_at: string;
}

// ── Tree builder ──────────────────────────────────────────────────────────────

function buildTree(
  rows: BizRow[],
  edgeMap: Map<string, number>,
  parentId: string | null,
): TreeNode[] {
  return rows
    .filter((r) => (r.parent_business_id ?? null) === parentId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      name_ar: r.name_ar,
      slug: r.slug,
      type_id: r.type_id,
      custom_domain: r.custom_domain,
      edge_count: edgeMap.get(r.id) ?? 0,
      children: buildTree(rows, edgeMap, r.id),
    }));
}

// ── Tab nav ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',       label: '📊 Overview' },
  { key: 'tree',           label: '🌳 Topology Tree' },
  { key: 'relationships',  label: '🔗 Relationships' },
  { key: 'setup',          label: '⚙️ Platform Setup' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PlatformAdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin/platform', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user || user.role !== 'platform_admin') notFound();

  const { tab: rawTab } = await searchParams;
  const activeTab: TabKey = (TABS.some((t) => t.key === rawTab) ? rawTab : 'overview') as TabKey;

  // ── Always-loaded queries ──────────────────────────────────────────────────

  const brands = await query<{ id: string; name: string; name_ar: string | null }>(
    `SELECT id, name, name_ar FROM businesses WHERE type_id = 'vehicle_brand' AND status = 'active' ORDER BY name`
  );

  const models = await query<{ id: string; name: string; name_ar: string | null; parent_business_id: string }>(
    `SELECT id, name, name_ar, parent_business_id FROM businesses WHERE type_id = 'vehicle_model' AND status = 'active' ORDER BY name`
  );

  const stats = await query<{
    total_businesses: number;
    total_listings: number;
    total_relationships: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM businesses WHERE parent_business_id IS NULL) AS total_businesses,
       (SELECT COUNT(*) FROM businesses WHERE type_id = 'car_listing') AS total_listings,
       (SELECT COUNT(*) FROM business_relationships) AS total_relationships`
  );

  const s = stats[0] || { total_businesses: 0, total_listings: 0, total_relationships: 0 };

  // ── Tab-conditional queries ────────────────────────────────────────────────

  let showrooms: {
    id: string; name: string; name_ar: string | null; slug: string;
    custom_domain: string | null; type_id: string; status: string; created_at: string;
  }[] = [];

  let treeRoots: TreeNode[] = [];
  let totalNodes = 0;
  let totalEdges = 0;

  let relationships: Relationship[] = [];
  let allBusinesses: { id: string; name: string; name_ar: string | null; type_id: string }[] = [];
  const relationTypes = allowedRelationTypes();

  if (activeTab === 'overview') {
    showrooms = await query<typeof showrooms[number]>(
      `SELECT id, name, name_ar, slug, custom_domain, type_id, status, created_at
         FROM businesses
        WHERE parent_business_id IS NULL AND type_id IN ('showroom', 'main_agency', 'distributor', 'used_car_dealer')
        ORDER BY created_at DESC`
    );
  }

  if (activeTab === 'tree') {
    const allBiz = await query<BizRow>(
      `SELECT id, name, name_ar, slug, type_id, custom_domain, parent_business_id
         FROM businesses WHERE status = 'active' ORDER BY name`
    );
    const edgeRows = await query<{ bid: string; edge_count: number }>(
      `SELECT from_business_id as bid, COUNT(*) as edge_count
         FROM business_relationships GROUP BY from_business_id`
    );
    const edgeMap = new Map<string, number>(
      edgeRows.map((e) => [e.bid, Number(e.edge_count)])
    );
    treeRoots = buildTree(allBiz, edgeMap, null);
    totalNodes = allBiz.length;
    totalEdges = edgeRows.reduce((acc, e) => acc + Number(e.edge_count), 0);
  }

  let setupMarkets: { id: string; slug: string; name_en: string; name_ar: string | null; default_locale: string; currency: string; active: number }[] = [];
  let setupTypes: { id: string; name: string; name_ar: string | null; icon: string | null; is_parent: number; parent_id: string | null; market_id: string; vendor_claimable: number; sort_order: number; sections: string | null; own_sections: string | null }[] = [];
  let setupSections: { id: string; name: string; name_ar: string | null; icon: string | null; sort_order: number; enable_gallery: number; enable_blog: number; options: string | null }[] = [];

  if (activeTab === 'setup') {
    [setupMarkets, setupTypes, setupSections] = await Promise.all([
      query<typeof setupMarkets[number]>(`SELECT id, slug, name_en, name_ar, default_locale, currency, active FROM markets ORDER BY id`),
      query<typeof setupTypes[number]>(`SELECT id, name, name_ar, icon, is_parent, parent_id, market_id, vendor_claimable, sort_order, sections, own_sections FROM business_types ORDER BY sort_order, id`),
      query<typeof setupSections[number]>(`SELECT id, name, name_ar, icon, sort_order, enable_gallery, enable_blog, options FROM sections ORDER BY sort_order, id`),
    ]);
  }

  if (activeTab === 'relationships') {
    relationships = await query<Relationship>(
      `SELECT br.id, br.relation_type, br.is_primary, br.created_at,
              f.id as from_id, f.name as from_name, f.name_ar as from_name_ar, f.type_id as from_type,
              t.id as to_id, t.name as to_name, t.name_ar as to_name_ar, t.type_id as to_type
         FROM business_relationships br
         JOIN businesses f ON f.id = br.from_business_id
         JOIN businesses t ON t.id = br.to_business_id
         ORDER BY br.created_at DESC LIMIT 200`
    );
    allBusinesses = await query<{ id: string; name: string; name_ar: string | null; type_id: string }>(
      `SELECT id, name, name_ar, type_id FROM businesses WHERE status = 'active' ORDER BY name`
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-8">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <div className="inline-block text-[11px] font-extrabold bg-red-500/10 text-red-600 px-2.5 py-0.5 rounded-full mb-1">
            Super Admin Portal
          </div>
          <h1 className="text-2xl font-bold">لوحة التحكم العليا للمنصة (Platform Master)</h1>
          <p className="text-xs opacity-60 mt-1">
            إدارة كافة المعارض، الوكلاء، الدومينات الخاصة، والمخزون الوطني للسيارات
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/platform/business-applications"
            className="text-xs px-3 py-2 rounded-lg border border-amber-600/30 font-semibold hover:bg-amber-500/5"
          >
            AL Mostashar Auto licenses
          </Link>
          <Link
            href="/admin/platform/blog"
            className="text-xs px-3 py-2 rounded-lg border border-black/15 font-semibold hover:bg-black/5"
          >
            📝 Platform blog
          </Link>
          <RegistryTriggerButton />
          <TaxonomyFeedModal brands={brands} models={models} />
          <a
            href="/"
            target="_blank"
            className="text-xs px-3 py-2 rounded-lg border border-black/15 font-semibold hover:bg-black/5"
          >
            فتح البوابة الوطنية ↗
          </a>
        </div>
      </div>

      {/* Global Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-black/10 bg-white dark:bg-neutral-900 shadow-sm text-center">
          <div className="text-3xl font-extrabold text-blue-600">{s.total_businesses}</div>
          <div className="text-xs font-bold opacity-70 mt-1">إجمالي المعارض والوكالات</div>
        </div>
        <div className="p-5 rounded-2xl border border-black/10 bg-white dark:bg-neutral-900 shadow-sm text-center">
          <div className="text-3xl font-extrabold text-green-600">{s.total_listings}</div>
          <div className="text-xs font-bold opacity-70 mt-1">سيارات معروضة للبيع حالياً</div>
        </div>
        <div className="p-5 rounded-2xl border border-black/10 bg-white dark:bg-neutral-900 shadow-sm text-center">
          <div className="text-3xl font-extrabold text-purple-600">{s.total_relationships}</div>
          <div className="text-xs font-bold opacity-70 mt-1">روابط التوزيع والتمويل</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div dir="ltr" className="flex gap-1 border-b border-black/10 pb-0">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/platform?tab=${tab.key}`}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border border-b-0 transition-colors ${
              activeTab === tab.key
                ? 'bg-black text-white border-black/20'
                : 'border-transparent hover:bg-black/5 opacity-70'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold">المعارض والشركات المسجلة على المنصة ({showrooms.length})</h2>
          </div>

          <div className="divide-y divide-black/10 border border-black/10 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
            {showrooms.map((sh) => (
              <div key={sh.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/[.01]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{sh.name_ar || sh.name}</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      {sh.type_id === 'showroom' ? 'معرض' : sh.type_id}
                    </span>
                    <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full font-bold">
                      نشط
                    </span>
                  </div>
                  <div className="text-xs opacity-60 flex flex-wrap gap-4">
                    <span>الرابط على البوابة: <strong>/{sh.slug}</strong></span>
                    {sh.custom_domain && (
                      <span className="text-blue-600 font-semibold">
                        🌐 دومين خاص: <strong>{sh.custom_domain}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/admin/showroom/${sh.id}`}
                    className="text-xs px-3.5 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-bold hover:opacity-85 shadow-sm"
                  >
                    الدخول للوحة تحكم المعرض ←
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tree' && (
        <TopologyTreeView roots={treeRoots} totalNodes={totalNodes} totalEdges={totalEdges} />
      )}

      {activeTab === 'relationships' && (
        <div dir="ltr">
          <RelationshipManager
            initialRelationships={relationships}
            allBusinesses={allBusinesses}
            relationTypes={relationTypes}
          />
        </div>
      )}

      {activeTab === 'setup' && (
        <div dir="ltr">
          <SetupPanelClient
            initialMarkets={setupMarkets}
            initialTypes={setupTypes}
            initialSections={setupSections}
          />
        </div>
      )}
    </div>
  );
}
