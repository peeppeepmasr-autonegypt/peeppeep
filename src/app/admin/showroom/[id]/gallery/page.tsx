import { headers } from 'next/headers';
import { getAdminUser, canAccessBusiness } from '@/lib/admin-auth';
import { queryOne, query } from '@/lib/db';
import { notFound } from 'next/navigation';
import MobileCameraUploader from '@/components/MobileCameraUploader';
import YouTubeEmbedForm from '@/components/YouTubeEmbedForm';

type Params = { params: Promise<{ id: string }> };

export default async function GalleryPage({ params }: Params) {
  const { id } = await params;

  const hdrs = await headers();
  const fakeReq = new Request('http://localhost/admin', {
    headers: Object.fromEntries(hdrs.entries()),
  });
  const user = await getAdminUser(fakeReq);
  if (!user || !canAccessBusiness(user, id)) notFound();

  const showroom = await queryOne<{ id: string; name: string; name_ar: string | null; slug: string }>(
    'SELECT id, name, name_ar, slug FROM businesses WHERE id = ? AND status = \'active\'',
    [id],
  );
  if (!showroom) notFound();

  const images = await query<{
    id: string; url: string; caption: string | null; caption_ar: string | null;
    section_id: string | null; is_hero: number; display_order: number;
  }>(
    `SELECT id, url, caption, caption_ar, section_id, is_hero, display_order
       FROM vendor_gallery
      WHERE business_id = ? AND show_on_minisite = 1
      ORDER BY display_order`,
    [id],
  );

  return (
    <div dir="rtl" className="space-y-6">
      {/* Arabic Breadcrumb */}
      <nav className="text-sm opacity-60 flex gap-2">
        <a href="/admin" className="hover:underline">لوحة التحكم</a>
        <span>/</span>
        <a href={`/admin/showroom/${id}`} className="hover:underline">
          {showroom.name_ar || showroom.name}
        </a>
        <span>/</span>
        <span>معرض الصور والوسائط</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">صور المعرض والسيارات</h1>
          <p className="text-xs opacity-60 mt-0.5">
            التقط صور السيارات مباشرة من هاتفك المحمول أو ارفعها من الأستوديو
          </p>
        </div>
        <span className="text-xs bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-full font-bold">
          {images.length} صورة
        </span>
      </div>

      {/* Mobile Camera Direct Uploader Component */}
      <MobileCameraUploader businessId={id} locale="ar" />

      {/* YouTube Video Embed Form */}
      <YouTubeEmbedForm businessId={id} />

      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold opacity-70">الصور المرفوعة حالياً</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/15 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption_ar || img.caption || ''}
                  className="w-full h-36 object-cover"
                  loading="lazy"
                />
                {img.is_hero === 1 && (
                  <span className="absolute top-2 start-2 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow">
                    صورة رئيسية
                  </span>
                )}
                <div className="p-2 text-xs opacity-75 truncate bg-white dark:bg-neutral-900">
                  {img.caption_ar || img.caption || img.section_id || 'صورة سيارة'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
