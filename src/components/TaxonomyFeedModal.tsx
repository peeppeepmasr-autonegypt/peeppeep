'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TaxonomyFeedModal({
  brands,
  models,
}: {
  brands: Array<{ id: string; name: string; name_ar: string | null }>;
  models: Array<{ id: string; name: string; name_ar: string | null; parent_business_id: string }>;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [level, setLevel] = useState<'brand' | 'model' | 'trim'>('brand');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(brands[0]?.id || '');
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filteredModels = models.filter((m) => m.parent_business_id === selectedBrand);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const parent_id = level === 'model' ? selectedBrand : level === 'trim' ? selectedModel : undefined;

    try {
      const res = await fetch('/api/admin/taxonomy/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: level,
          name: nameEn || nameAr,
          name_ar: nameAr,
          parent_id,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'فشلت الإضافة');
      }

      setMsg('✓ تمت إضافة البيانات بنجاح لقاعدة بيانات المنصة!');
      setNameEn('');
      setNameAr('');
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        setMsg(null);
      }, 1500);
    } catch (err: any) {
      setMsg(`❌ خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
      >
        <span>➕</span>
        <span>تغذية ماركة أو طراز أو فئة جديدة (Feed Taxonomy)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/15 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-black/10 pb-3">
              <h3 className="font-bold text-lg">إضافة وتغذية الكتالوج المرجعي للمنصة</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold size-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Level Selector */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setLevel('brand')}
                className={`py-2 rounded-lg transition ${level === 'brand' ? 'bg-blue-600 text-white shadow' : 'opacity-70'}`}
              >
                ماركة جديدة
              </button>
              <button
                type="button"
                onClick={() => setLevel('model')}
                className={`py-2 rounded-lg transition ${level === 'model' ? 'bg-blue-600 text-white shadow' : 'opacity-70'}`}
              >
                طراز تحت ماركة
              </button>
              <button
                type="button"
                onClick={() => setLevel('trim')}
                className={`py-2 rounded-lg transition ${level === 'trim' ? 'bg-blue-600 text-white shadow' : 'opacity-70'}`}
              >
                فئة مواصفات (Trim)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {level === 'model' && (
                <div>
                  <label className="block text-xs font-bold mb-1">اختر الماركة التابع لها *</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    required
                    className="w-full text-sm rounded-xl border border-black/15 p-2.5 bg-transparent"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_ar || b.name} ({b.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {level === 'trim' && (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1">الماركة *</label>
                    <select
                      value={selectedBrand}
                      onChange={(e) => {
                        setSelectedBrand(e.target.value);
                        setSelectedModel('');
                      }}
                      required
                      className="w-full text-sm rounded-xl border border-black/15 p-2.5 bg-transparent"
                    >
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name_ar || b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">الطراز *</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      required
                      className="w-full text-sm rounded-xl border border-black/15 p-2.5 bg-transparent"
                    >
                      <option value="">-- اختر الطراز --</option>
                      {filteredModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name_ar || m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">الاسم بالعربية *</label>
                  <input
                    type="text"
                    placeholder="مثال: مرسيدس / C-Class"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    required
                    className="w-full text-sm rounded-xl border border-black/15 p-2.5 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">الاسم بالإنجليزية</label>
                  <input
                    type="text"
                    placeholder="e.g. Mercedes-Benz"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full text-sm rounded-xl border border-black/15 p-2.5 bg-transparent"
                  />
                </div>
              </div>

              {msg && <div className="text-xs font-bold p-2 rounded-lg bg-blue-500/10 text-blue-600">{msg}</div>}

              <div className="flex justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-black/15 text-xs font-bold hover:bg-black/5"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow"
                >
                  {loading ? 'جاري الحفظ...' : '+ حفظ وإتاحة في القوائم فوراً'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
