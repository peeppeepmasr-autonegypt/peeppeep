'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function YouTubeEmbedForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/admin/gallery/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          youtube_url: url,
          title_ar: titleAr || 'فيديو مراجعة وتجربة حية',
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'فشل في ربط الفيديو');
      }

      setStatus('✓ تم تضمين فيديو اليوتيوب في السلايدر بنجاح!');
      setUrl('');
      setTitleAr('');
      router.refresh();
    } catch (err: any) {
      setStatus(`❌ خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl text-red-600">▶️</span>
        <div>
          <h4 className="font-bold text-base text-red-600 dark:text-red-400">
            تضمين فيديو يوتيوب في السلايدر السينمائي (YouTube Walkaround)
          </h4>
          <p className="text-xs opacity-70">
            ضع رابط أي فيديو يوتيوب (تجربة قيادة، صوت الشكمان، أو مراجعة تفصيلية للسيارة) ليعمل مباشرة داخل السلايدر!
          </p>
        </div>
      </div>

      <form onSubmit={handleEmbed} className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          placeholder="ضع رابط فيديو اليوتيوب هنا (مثال: https://youtu.be/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-1 text-sm rounded-xl border border-black/15 dark:border-white/20 p-2.5 bg-white dark:bg-neutral-900"
        />
        <input
          type="text"
          placeholder="عنوان الفيديو (مثال: تجربة قيادة وتسارع السيارة)"
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          className="sm:w-64 text-sm rounded-xl border border-black/15 dark:border-white/20 p-2.5 bg-white dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md active:scale-95 transition whitespace-nowrap"
        >
          {loading ? 'جاري الربط...' : '+ تضمين في السلايدر'}
        </button>
      </form>

      {status && <div className="text-xs font-bold mt-2 text-red-600 dark:text-red-400">{status}</div>}
    </div>
  );
}
