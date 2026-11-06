/**
 * POST /api/admin/gallery/youtube
 *
 * Embed a YouTube review or walkaround video directly into the car's carousel.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/admin-auth';
import { execute } from '@/lib/db';

export const runtime = 'edge';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  let body: {
    business_id?: string;
    section_id?: string;
    youtube_url?: string;
    title_ar?: string;
    title_en?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { business_id, section_id = 'sec_auto_exterior', youtube_url, title_ar, title_en } = body;

  if (!business_id || !youtube_url) {
    return NextResponse.json({ error: 'business_id and youtube_url are required' }, { status: 400 });
  }

  const auth = await requireBusinessAccess(req, business_id);
  if (auth instanceof Response) return auth;

  const videoId = extractYouTubeId(youtube_url);
  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.' }, { status: 400 });
  }

  const id = `gal_yt_${globalThis.crypto.randomUUID().slice(0, 8)}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  await execute(
    `INSERT INTO vendor_gallery
       (id, business_id, section_id, url, caption, caption_ar, media_type, video_id, display_order, placement, is_hero, show_on_minisite, approval_status)
     VALUES (?, ?, ?, ?, ?, ?, 'youtube', ?, 0, 'carousel', 1, 1, 'approved')`,
    [
      id,
      business_id,
      section_id,
      thumbnailUrl,
      title_en || 'YouTube Video Review',
      title_ar || 'فيديو مراجعة وتجربة حية',
      videoId,
    ]
  );

  return NextResponse.json({ ok: true, id, videoId, thumbnailUrl }, { status: 201 });
}
