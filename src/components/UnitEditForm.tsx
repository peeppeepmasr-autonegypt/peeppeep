/**
 * UnitEditForm — the vendor's unit editor.
 *
 * Client component that PATCHes /api/admin/units/[id]. The parent (a server
 * component) loads the raw unit row and passes it in. Fields we do not send
 * on PATCH: `slug`, `seller_business_id`, `owner_business_id`, `stock_source`
 * — those are set at create time by the typology guard and would need a
 * separate, audited flow to change.
 *
 * The `overrides` blob is a JSON textarea. It is deliberately not a form per
 * field, because the field list is typology-driven and lives in `fields` — a
 * bespoke UI would need to fetch sections + fields at mount, which is fine
 * but out of scope for the first pass. The API guards override keys with
 * `assertUnitOverrideKey`, so an invalid key returns 409 with a readable
 * sentence rather than corrupting the row.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface EditableUnit {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  unit_kind: string;
  vehicle_category: string;
  status: string;
  year: number | null;
  mileage_km: number | null;
  vin: string | null;
  color: string | null;
  color_ar: string | null;
  price_egp: number | null;
  price_currency: string;
  negotiable: number;
  published: number;
  model_business_id: string | null;
  trim_business_id: string | null;
  overrides: string | null;
}

const KIND_OPTIONS = ['new', 'used', 'demo', 'lease_return'];
const STATUS_OPTIONS = ['available', 'reserved', 'sold', 'rented', 'inactive'];

export default function UnitEditForm({
  unit,
  showroomId,
}: {
  unit: EditableUnit;
  showroomId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: unit.title ?? '',
    title_ar: unit.title_ar ?? '',
    unit_kind: unit.unit_kind,
    vehicle_category: unit.vehicle_category,
    status: unit.status,
    year: unit.year == null ? '' : String(unit.year),
    mileage_km: unit.mileage_km == null ? '' : String(unit.mileage_km),
    vin: unit.vin ?? '',
    color: unit.color ?? '',
    color_ar: unit.color_ar ?? '',
    price_egp: unit.price_egp == null ? '' : String(unit.price_egp),
    price_currency: unit.price_currency ?? 'EGP',
    negotiable: unit.negotiable,
    published: unit.published,
    overrides: unit.overrides ?? '',
  });

  const inputCls =
    'w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40';
  const labelCls = 'text-[11px] uppercase font-bold opacity-60 mb-1 block';

  async function save() {
    setErr(null); setOk(null); setSaving(true);
    const body: Record<string, unknown> = {
      title: form.title,
      title_ar: form.title_ar || null,
      unit_kind: form.unit_kind,
      vehicle_category: form.vehicle_category,
      status: form.status,
      year: form.year ? Number(form.year) : null,
      mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
      vin: form.vin || null,
      color: form.color || null,
      color_ar: form.color_ar || null,
      price_egp: form.price_egp ? Number(form.price_egp) : null,
      price_currency: form.price_currency || 'EGP',
      negotiable: form.negotiable,
      published: form.published,
    };
    if (form.overrides.trim()) {
      try {
        body.overrides = JSON.parse(form.overrides);
      } catch {
        setErr('overrides must be valid JSON');
        setSaving(false);
        return;
      }
    }
    const res = await fetch(`/api/admin/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErr((json as { error?: string }).error ?? `HTTP ${res.status}`); setSaving(false); return; }
    setOk('تم الحفظ');
    setSaving(false);
    router.refresh();
  }

  async function hardDelete() {
    if (!confirm('سيتم إخفاء هذه السيارة نهائياً من المخزون المنشور. متابعة؟')) return;
    setErr(null); setSaving(true);
    const res = await fetch(`/api/admin/units/${unit.id}`, { method: 'DELETE' });
    setSaving(false);
    if (!res.ok) { setErr(`HTTP ${res.status}`); return; }
    router.push(`/admin/showroom/${showroomId}/inventory`);
    router.refresh();
  }

  const num = (v: string) => Number(v);
  const priceChanged = num(form.price_egp || '0') !== (unit.price_egp ?? 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>العنوان (EN)</label>
          <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>العنوان (عربي)</label>
          <input className={inputCls} value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} />
        </div>

        <div>
          <label className={labelCls}>النوع</label>
          <select className={inputCls} value={form.unit_kind} onChange={(e) => setForm({ ...form, unit_kind: e.target.value })}>
            {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>فئة المركبة</label>
          <select className={inputCls} value={form.vehicle_category} onChange={(e) => setForm({ ...form, vehicle_category: e.target.value })}>
            <option value="car">سيارة</option>
            <option value="motorcycle">دراجة نارية</option>
            <option value="scooter">سكوتر</option>
            <option value="commercial">مركبة تجارية</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>الحالة</label>
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>سنة الصنع</label>
          <input type="number" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>الكيلومترات</label>
          <input type="number" className={inputCls} value={form.mileage_km} onChange={(e) => setForm({ ...form, mileage_km: e.target.value })} />
        </div>

        <div>
          <label className={labelCls}>السعر (ج.م)</label>
          <input type="number" className={inputCls} value={form.price_egp} onChange={(e) => setForm({ ...form, price_egp: e.target.value })} />
          {priceChanged && <div className="text-[10px] opacity-60 mt-1">تغيير السعر يُسجَّل كالتقاط سعر جديد تلقائياً.</div>}
        </div>
        <div>
          <label className={labelCls}>العملة</label>
          <input className={inputCls} value={form.price_currency} onChange={(e) => setForm({ ...form, price_currency: e.target.value })} />
        </div>

        <div>
          <label className={labelCls}>اللون (EN)</label>
          <input className={inputCls} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>اللون (عربي)</label>
          <input className={inputCls} value={form.color_ar} onChange={(e) => setForm({ ...form, color_ar: e.target.value })} />
        </div>

        <div>
          <label className={labelCls}>VIN</label>
          <input className={inputCls} value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
        </div>
        <div className="flex items-end gap-4">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={form.negotiable === 1} onChange={(e) => setForm({ ...form, negotiable: e.target.checked ? 1 : 0 })} />
            قابل للتفاوض
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={form.published === 1} onChange={(e) => setForm({ ...form, published: e.target.checked ? 1 : 0 })} />
            منشور
          </label>
        </div>
      </div>

      <div>
        <label className={labelCls}>Overrides (JSON)</label>
        <textarea
          rows={8}
          className={inputCls + ' font-mono text-xs'}
          value={form.overrides}
          onChange={(e) => setForm({ ...form, overrides: e.target.value })}
          placeholder='{"sec_specs_engine": {"horsepower": 300}}'
        />
        <div className="text-[10px] opacity-60 mt-1">
          مفاتيح يجب أن تمر عبر `assertUnitOverrideKey`. خطأ هنا → 409 مع جملة الحرّاس.
        </div>
      </div>

      {err && <div className="text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{err}</div>}
      {ok && <div className="text-sm font-bold text-green-700 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">{ok}</div>}

      <div className="flex gap-3 pt-2 border-t border-black/10 dark:border-white/10">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50"
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
        </button>
        <button
          onClick={hardDelete}
          disabled={saving || unit.status === 'inactive'}
          className="px-4 py-2 rounded-lg border border-red-500/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-bold disabled:opacity-40"
        >
          إخفاء من المخزون (soft delete)
        </button>
      </div>
    </div>
  );
}
