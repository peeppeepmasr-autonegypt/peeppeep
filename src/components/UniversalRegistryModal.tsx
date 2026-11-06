'use client';

import React, { useState, useEffect } from 'react';

interface KindReport {
  kind: string;
  name: string;
  name_ar: string | null;
  is_parent: number;
  vendor_claimable: number;
}

interface TreeNode {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  type_id: string;
}

export default function UniversalRegistryModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [kinds, setKinds] = useState<KindReport[]>([]);
  const [parentCandidates, setParentCandidates] = useState<TreeNode[]>([]);

  const [typeId, setTypeId] = useState('vehicle_model');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [serviceLevel, setServiceLevel] = useState<'template' | 'curated'>('template');
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro' | 'enterprise'>('free');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ url: string; slug: string; shelvesCount: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/admin/setup/contract')
      .then((r) => r.json())
      .then((d) => {
        if (d.reports) {
          setKinds(d.reports.filter((k: KindReport) => !k.is_parent));
        }
      })
      .catch(() => {});

    fetch('/api/admin/topology/tree')
      .then((r) => r.json())
      .then((d) => {
        if (d.tree) {
          const flat: TreeNode[] = [];
          const collect = (nodes: any[]) => {
            for (const n of nodes) {
              flat.push({ id: n.id, name: n.name, name_ar: n.name_ar, slug: n.slug, type_id: n.type_id });
              if (n.children?.length) collect(n.children);
            }
          };
          collect(d.tree);
          setParentCandidates(flat);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_id: typeId,
          name,
          name_ar: nameAr || name,
          slug,
          parent_business_id: parentId || undefined,
          custom_domain: customDomain || undefined,
          service_level: serviceLevel,
          subscription_tier: subscriptionTier,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التسجيل التلقائي');

      setSuccess({
        url: data.node.website_policy.public_url,
        slug: data.node.slug,
        shelvesCount: data.node.website_policy.shelves_count,
      });

      if (onCreated) onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-[#faf9f6] text-[#0d0f12] border border-[#c4a265]/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-[#c4a265]/20 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b7340] bg-[#c4a265]/10 px-2.5 py-1 rounded-full">
              السجل المركزي التلقائي
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold mt-1 text-[#0d0f12]">
              تسجيل سيارة أو تاجر وتوليد سياسة موقعه
            </h2>
          </div>
          <button onClick={onClose} className="text-[#636b75] hover:text-[#0d0f12] text-xl font-bold p-1">
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-3xl font-bold">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[#0d0f12]">تم إنشاء الكيان وتفعيل موقعه تلقائياً!</h3>
            <p className="text-sm text-[#636b75] max-w-md mx-auto">
              تم توليد سياسة الموقع التلقائية برقم رفوف إجمالي{' '}
              <strong className="text-[#0d0f12]">{success.shelvesCount} رف مخصص</strong>.
            </p>
            <div className="p-3 bg-white rounded-xl border border-[#c4a265]/20 font-mono text-sm">
              الرابط العام: <a href={success.url} target="_blank" className="text-[#8b7340] underline font-bold">{success.url}</a>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  setSuccess(null);
                  setName('');
                  setNameAr('');
                  setSlug('');
                }}
                className="px-5 py-2.5 bg-[#f2efe9] text-[#0d0f12] font-semibold text-xs rounded-xl hover:bg-[#eae6de]"
              >
                تسجيل كيان آخر
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#c4a265] text-black font-semibold text-xs rounded-xl hover:bg-[#d1b072]"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs text-center font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  نوع الكيان المطلوب تسجيله
                </label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265]"
                >
                  <optgroup label="عالم السيارات والمركبات">
                    <option value="vehicle_brand">ماركة سيارات (Car Brand)</option>
                    <option value="vehicle_model">طراز سيارة (Vehicle Model)</option>
                    <option value="vehicle_trim">فئة محددة (Vehicle Trim)</option>
                    <option value="factory">مصنع تجميع (Factory)</option>
                  </optgroup>
                  <optgroup label="المعارض والجهات التجارية">
                    <option value="main_agency">توكيل رسمي رئيسي (Main Agency)</option>
                    <option value="showroom">معرض سيارات (Showroom)</option>
                    <option value="distributor">موزع معتمد (Distributor)</option>
                    <option value="agent_broker">وسيط / موزع معتمد</option>
                    <option value="used_car_dealer">معرض سيارات مستعملة</option>
                  </optgroup>
                  <optgroup label="التمويل والتأمين والخدمات">
                    <option value="finance_bank">بنك تمويل سيارات</option>
                    <option value="leasing_company">شركة تأجير تمويلي</option>
                    <option value="insurance_company">شركة تأمين</option>
                    <option value="service_center">مركز صيانة معتمد</option>
                    <option value="spare_parts">مركز قطع غيار</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  العقدة الأب في الشجرة (Parent Node)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265]"
                >
                  <option value="">(بدون أب — عقدة رئيسية جذعية)</option>
                  {parentCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_ar || p.name} ({p.type_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  الاسم بالعربية
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بي إم دبليو X5 أو معرض النصر"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BMW X5 or Al-Nasr Motors"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  الرابط المخصص (Slug) — اختياري
                </label>
                <input
                  type="text"
                  placeholder="اتركه فارغاً للتوليد التلقائي"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265] font-mono text-xs"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  دومين خاص مستقل (Custom Domain) — اختياري
                </label>
                <input
                  type="text"
                  placeholder="e.g. alnasrmotors.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265] font-mono text-xs"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  سياسة مستوى الخدمة (Service Level)
                </label>
                <select
                  value={serviceLevel}
                  onChange={(e) => setServiceLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265]"
                >
                  <option value="template">قالب مجاني تلقائي (Template Level 1)</option>
                  <option value="curated">موقع مخصص ومعتمد من الإدارة (Curated Level 2)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0d0f12] mb-1.5">
                  باقة العضوية (Tier)
                </label>
                <select
                  value={subscriptionTier}
                  onChange={(e) => setSubscriptionTier(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265]"
                >
                  <option value="free">عضوية مجانية (Free)</option>
                  <option value="pro">عضوية احترافية (Pro)</option>
                  <option value="enterprise">عضوية مؤسسات (Enterprise)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[#c4a265]/20 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[#c4a265]/30 text-xs font-bold text-[#636b75] hover:bg-black/5"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c4a265] to-[#8b7340] text-black text-xs font-bold hover:from-[#d1b072] disabled:opacity-50 shadow-md shadow-[#c4a265]/20"
              >
                {loading ? 'جاري التسجيل والتوليد...' : 'تسجيل وتوليد الموقع فوراً ✓'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
