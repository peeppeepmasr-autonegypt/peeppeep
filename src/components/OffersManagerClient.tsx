/**
 * OffersManagerClient — vendor's model-offer screen.
 *
 * An offer is a claim about what a MODEL costs from this seller. Authority is
 * enforced server-side by `assertOfferAuthority`; a mismatched claim (e.g. a
 * showroom trying to publish agency_official) returns 409 with the guard's
 * sentence, which this form surfaces verbatim.
 *
 * The list is rendered server-side and passed in. Create/edit hit POST/PATCH
 * on /api/admin/offers. Published/unpublished toggle is PATCH on `published`.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface OfferRow {
  id: string;
  authority: string;
  trim: string;
  unit_kind: string;
  price_from_egp: number | null;
  price_to_egp: number | null;
  published: number;
  updated_at: string;
  model_name: string;
  model_name_ar: string | null;
  model_slug: string;
}

export interface ModelOption { id: string; slug: string; name: string; name_ar: string | null; }

const AUTHORITIES = ['agency_official', 'distributor', 'dealer', 'broker'];

export default function OffersManagerClient({
  initial,
  models,
  sellerBusinessId,
  sellerAuthorityHint,
}: {
  initial: OfferRow[];
  models: ModelOption[];
  sellerBusinessId: string;
  sellerAuthorityHint: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    model_business_id: models[0]?.id ?? '',
    trim: '',
    unit_kind: '',
    authority: 'dealer',
    price_from_egp: '',
    price_to_egp: '',
    availability_note: '',
    availability_note_ar: '',
    published: 1,
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setSaving(true);
    const body = {
      model_business_id: form.model_business_id,
      seller_business_id: sellerBusinessId,
      trim: form.trim,
      unit_kind: form.unit_kind,
      authority: form.authority,
      price_from_egp: form.price_from_egp ? Number(form.price_from_egp) : null,
      price_to_egp: form.price_to_egp ? Number(form.price_to_egp) : null,
      availability_note: form.availability_note || null,
      availability_note_ar: form.availability_note_ar || null,
      published: form.published,
    };
    const res = await fetch('/api/admin/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? `HTTP ${res.status}`);
      setSaving(false);
      return;
    }
    setSaving(false);
    router.refresh();
    // Reload list without a full page refresh
    setTimeout(async () => {
      const fresh = await fetch('/api/admin/setup/contract').catch(() => null);
      if (fresh) return; // refresh handled by router.refresh()
    }, 100);
  }

  async function togglePublished(id: string, currentlyPublished: number) {
    setErr(null);
    const res = await fetch('/api/admin/offers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, published: currentlyPublished ? 0 : 1 }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? `HTTP ${res.status}`);
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, published: r.published ? 0 : 1 } : r)));
  }

  const inputCls =
    'w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40';
  const labelCls = 'text-[11px] uppercase font-bold opacity-60 mb-1 block';

  return (
    <div className="space-y-6">
      {/* Create form */}
      <form onSubmit={create} className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02] space-y-3">
        <div className="text-sm font-bold">➕ عرض جديد</div>
        <div className="text-[11px] opacity-60">
          صلاحية البائع الحالية: <span className="font-mono font-bold">{sellerAuthorityHint}</span> — الحرّاس يرفضون أي مطالبة أعلى من هذه.
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>الموديل</label>
            <select className={inputCls} value={form.model_business_id} onChange={(e) => setForm({ ...form, model_business_id: e.target.value })}>
              {models.length === 0 && <option value="">لا موديلات مسجّلة</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name_ar || m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>الصلاحية</label>
            <select className={inputCls} value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })}>
              {AUTHORITIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>الفئة (trim)</label>
            <input className={inputCls} value={form.trim} onChange={(e) => setForm({ ...form, trim: e.target.value })} placeholder="EX, Touring…" />
          </div>
          <div>
            <label className={labelCls}>الحالة (kind)</label>
            <select className={inputCls} value={form.unit_kind} onChange={(e) => setForm({ ...form, unit_kind: e.target.value })}>
              <option value="">(أي)</option>
              <option value="new">new</option>
              <option value="used">used</option>
              <option value="demo">demo</option>
              <option value="lease_return">lease_return</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>السعر من (EGP)</label>
            <input type="number" className={inputCls} value={form.price_from_egp} onChange={(e) => setForm({ ...form, price_from_egp: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>السعر إلى (EGP)</label>
            <input type="number" className={inputCls} value={form.price_to_egp} onChange={(e) => setForm({ ...form, price_to_egp: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>منشور؟</label>
            <select className={inputCls} value={form.published} onChange={(e) => setForm({ ...form, published: Number(e.target.value) })}>
              <option value={1}>نعم</option>
              <option value={0}>لا</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className={labelCls}>ملاحظة التوفّر (AR)</label>
            <input className={inputCls} value={form.availability_note_ar} onChange={(e) => setForm({ ...form, availability_note_ar: e.target.value })} placeholder="متاح بالتقسيط على 60 شهر…" />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className={labelCls}>Availability note (EN)</label>
            <input className={inputCls} value={form.availability_note} onChange={(e) => setForm({ ...form, availability_note: e.target.value })} />
          </div>
        </div>
        {err && <div className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">{err}</div>}
        <button type="submit" disabled={saving || !form.model_business_id} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm">
          {saving ? 'جارٍ الحفظ…' : 'حفظ العرض'}
        </button>
      </form>

      {/* Existing offers */}
      <div className="space-y-2">
        <div className="text-sm font-bold">العروض الحالية ({rows.length})</div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm opacity-60 border-2 border-dashed border-black/15 dark:border-white/15 rounded-xl">
            لا توجد عروض محفوظة بعد.
          </div>
        ) : (
          <div className="overflow-x-auto border border-black/10 dark:border-white/10 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-black/5 dark:bg-white/5 text-xs">
                <tr>
                  <th className="text-right p-2">الموديل</th>
                  <th className="text-right p-2">الصلاحية</th>
                  <th className="text-right p-2">trim / kind</th>
                  <th className="text-right p-2">السعر</th>
                  <th className="text-right p-2">الحالة</th>
                  <th className="text-right p-2">آخر تحديث</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="p-2">{r.model_name_ar || r.model_name}</td>
                    <td className="p-2 font-mono text-xs">{r.authority}</td>
                    <td className="p-2 text-xs">{[r.trim, r.unit_kind].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="p-2 text-xs">
                      {r.price_from_egp ? `${r.price_from_egp.toLocaleString()}` : '—'}
                      {r.price_to_egp ? ` – ${r.price_to_egp.toLocaleString()}` : ''}
                    </td>
                    <td className="p-2 text-xs">
                      {r.published ? <span className="text-green-600 font-bold">● منشور</span> : <span className="opacity-50">○ مسودّة</span>}
                    </td>
                    <td className="p-2 text-xs opacity-60">{new Date(r.updated_at).toLocaleDateString('ar-EG')}</td>
                    <td className="p-2">
                      <button
                        onClick={() => togglePublished(r.id, r.published)}
                        className="text-xs px-2 py-1 rounded border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        {r.published ? 'إخفاء' : 'نشر'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
