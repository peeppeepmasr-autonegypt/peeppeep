import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import { batch, execute, query, queryOne } from '@/lib/db';
import { readingTime, slugify } from '@/lib/global-blog';

export const runtime = 'edge';

interface PostInput {
  id?: string;
  title?: string;
  title_ar?: string;
  slug?: string;
  excerpt?: string;
  excerpt_ar?: string;
  content?: string;
  content_ar?: string;
  featured_image_url?: string;
  author_name?: string;
  category?: string;
  category_ar?: string;
  tags?: string;
  status?: string;
  published_at?: string | null;
  seo_title?: string;
  seo_title_ar?: string;
  seo_description?: string;
  seo_description_ar?: string;
  meta_keywords?: string;
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

function imageUrl(value: unknown): string | null {
  const raw = text(value, 500);
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;

  const [posts, categories, tags, settings] = await Promise.all([
    query<{ id: string; [key: string]: unknown }>(`SELECT p.*, c.name AS category, c.name_ar AS category_ar
             FROM global_blog_posts p
             LEFT JOIN global_blog_categories c ON c.id = p.category_id
            ORDER BY p.updated_at DESC LIMIT 200`),
    query<{ id: string; slug: string; name: string; name_ar: string | null }>('SELECT id, slug, name, name_ar FROM global_blog_categories ORDER BY sort_order, name'),
    query<{ name: string }>('SELECT t.name FROM global_blog_tags t ORDER BY t.name'),
    queryOne<{ widgets: string }>('SELECT widgets FROM global_blog_settings WHERE id = 1'),
  ]);
  const postTags = await query<{ post_id: string; name: string }>(
    `SELECT pt.post_id, t.name
       FROM global_blog_post_tags pt
       JOIN global_blog_tags t ON t.id = pt.tag_id
      ORDER BY t.name`,
  );
  const tagsByPost = new Map<string, string[]>();
  for (const tag of postTags) {
    const values = tagsByPost.get(tag.post_id) ?? [];
    values.push(tag.name);
    tagsByPost.set(tag.post_id, values);
  }
  const parsedWidgets = (() => {
    try { return JSON.parse(settings?.widgets ?? '["carousel","search","recent","categories","tags"]') as string[]; }
    catch { return ['carousel', 'search', 'recent', 'categories', 'tags']; }
  })();
  return NextResponse.json({
    posts: posts.map((post) => ({ ...post, tags: tagsByPost.get(post.id) ?? [] })),
    categories,
    tags,
    widgets: parsedWidgets,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;
  let body: PostInput;
  try { body = await req.json() as PostInput; } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid post payload.' }, { status: 400 });

  const title = text(body.title, 255);
  const titleAr = text(body.title_ar, 255);
  if (!title && !titleAr) return NextResponse.json({ error: 'Enter a title in at least one language.' }, { status: 400 });
  const slug = slugify(text(body.slug, 120) || title || titleAr);
  if (!slug) return NextResponse.json({ error: 'The title must produce a URL-safe slug.' }, { status: 400 });
  if (!['draft', 'published', 'scheduled'].includes(body.status ?? 'draft')) {
    return NextResponse.json({ error: 'Status must be draft, published, or scheduled.' }, { status: 400 });
  }
  if ((body.status === 'scheduled' && !body.published_at) || (body.published_at && !Number.isFinite(new Date(body.published_at).valueOf()))) {
    return NextResponse.json({ error: 'Scheduled posts need a valid publish date and time.' }, { status: 400 });
  }
  if (body.status === 'published' && body.published_at && new Date(body.published_at).valueOf() > Date.now()) {
    return NextResponse.json({ error: 'Use scheduled status for a future publish time.' }, { status: 400 });
  }
  if (text(body.featured_image_url, 500) && !imageUrl(body.featured_image_url)) {
    return NextResponse.json({ error: 'Featured images must use an HTTPS URL or a local path.' }, { status: 400 });
  }
  const duplicate = await queryOne('SELECT id FROM global_blog_posts WHERE slug = ?', [slug]);
  if (duplicate) return NextResponse.json({ error: 'That post URL is already in use.' }, { status: 409 });

  const id = `post_${globalThis.crypto.randomUUID()}`;
  const categoryId = await upsertCategory(body.category, body.category_ar);
  const tagIds = await upsertTags(body.tags);
  const content = text(body.content, 500_000);
  const contentAr = text(body.content_ar, 500_000);
  const publishedAt = normalizeDate(body.published_at, body.status ?? 'draft');

  await batch([
    {
      sql: `INSERT INTO global_blog_posts
        (id, slug, title, title_ar, excerpt, excerpt_ar, content, content_ar,
         featured_image_url, author_name, category_id, status, published_at,
         seo_title, seo_title_ar, seo_description, seo_description_ar, meta_keywords, reading_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: postValues(body, { id, slug, title, titleAr, content, contentAr, categoryId, publishedAt }),
    },
    ...tagIds.map((tagId) => ({
      sql: 'INSERT OR IGNORE INTO global_blog_post_tags (post_id, tag_id) VALUES (?, ?)',
      params: [id, tagId],
    })),
  ]);
  return NextResponse.json({ ok: true, id, slug }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;
  let body: PostInput;
  try { body = await req.json() as PostInput; } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid post payload.' }, { status: 400 });
  if (!body.id) return NextResponse.json({ error: 'Post id is required.' }, { status: 400 });
  const existing = await queryOne<{ id: string }>('SELECT id FROM global_blog_posts WHERE id = ?', [body.id]);
  if (!existing) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

  const title = text(body.title, 255);
  const titleAr = text(body.title_ar, 255);
  if (!title && !titleAr) return NextResponse.json({ error: 'Enter a title in at least one language.' }, { status: 400 });
  const slug = slugify(text(body.slug, 120) || title || titleAr);
  if (!slug) return NextResponse.json({ error: 'The title must produce a URL-safe slug.' }, { status: 400 });
  if (!['draft', 'published', 'scheduled'].includes(body.status ?? 'draft')) {
    return NextResponse.json({ error: 'Status must be draft, published, or scheduled.' }, { status: 400 });
  }
  if ((body.status === 'scheduled' && !body.published_at) || (body.published_at && !Number.isFinite(new Date(body.published_at).valueOf()))) {
    return NextResponse.json({ error: 'Scheduled posts need a valid publish date and time.' }, { status: 400 });
  }
  if (body.status === 'published' && body.published_at && new Date(body.published_at).valueOf() > Date.now()) {
    return NextResponse.json({ error: 'Use scheduled status for a future publish time.' }, { status: 400 });
  }
  if (text(body.featured_image_url, 500) && !imageUrl(body.featured_image_url)) {
    return NextResponse.json({ error: 'Featured images must use an HTTPS URL or a local path.' }, { status: 400 });
  }
  const duplicate = await queryOne<{ id: string }>('SELECT id FROM global_blog_posts WHERE slug = ? AND id <> ?', [slug, body.id]);
  if (duplicate) return NextResponse.json({ error: 'That post URL is already in use.' }, { status: 409 });

  const categoryId = await upsertCategory(body.category, body.category_ar);
  const tagIds = await upsertTags(body.tags);
  const content = text(body.content, 500_000);
  const contentAr = text(body.content_ar, 500_000);
  const publishedAt = normalizeDate(body.published_at, body.status ?? 'draft');

  await batch([
    {
      sql: `UPDATE global_blog_posts SET
        slug = ?, title = ?, title_ar = ?, excerpt = ?, excerpt_ar = ?, content = ?, content_ar = ?,
        featured_image_url = ?, author_name = ?, category_id = ?, status = ?, published_at = ?,
        seo_title = ?, seo_title_ar = ?, seo_description = ?, seo_description_ar = ?, meta_keywords = ?,
        reading_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      params: [
        slug, title, titleAr, text(body.excerpt, 500), text(body.excerpt_ar, 500),
        content, contentAr, imageUrl(body.featured_image_url), text(body.author_name, 120),
        categoryId, body.status ?? 'draft', publishedAt, text(body.seo_title, 255),
        text(body.seo_title_ar, 255), text(body.seo_description, 500),
        text(body.seo_description_ar, 500), text(body.meta_keywords, 500),
        readingTime(`${content} ${contentAr}`), body.id,
      ],
    },
    { sql: 'DELETE FROM global_blog_post_tags WHERE post_id = ?', params: [body.id] },
    ...tagIds.map((tagId) => ({
      sql: 'INSERT OR IGNORE INTO global_blog_post_tags (post_id, tag_id) VALUES (?, ?)',
      params: [body.id, tagId],
    })),
  ]);
  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;
  let body: { id?: string };
  try { body = await req.json() as { id?: string }; } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: 'Post id is required.' }, { status: 400 });
  const result = await execute('DELETE FROM global_blog_posts WHERE id = ?', [body.id]);
  if (!result.changes) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

function postValues(
  body: PostInput,
  values: {
    id: string; slug: string; title: string; titleAr: string; content: string; contentAr: string;
    categoryId: string | null; publishedAt: string | null;
  },
): unknown[] {
  return [
    values.id, values.slug, values.title, values.titleAr,
    text(body.excerpt, 500), text(body.excerpt_ar, 500), values.content, values.contentAr,
    imageUrl(body.featured_image_url), text(body.author_name, 120), values.categoryId,
    body.status ?? 'draft', values.publishedAt, text(body.seo_title, 255),
    text(body.seo_title_ar, 255), text(body.seo_description, 500),
    text(body.seo_description_ar, 500), text(body.meta_keywords, 500),
    readingTime(`${values.content} ${values.contentAr}`),
  ];
}

function normalizeDate(value: string | null | undefined, status: string): string | null {
  if (status === 'draft') {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.valueOf()) ? date.toISOString() : null;
  }
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

async function upsertCategory(nameValue: unknown, nameArValue: unknown): Promise<string | null> {
  const name = text(nameValue, 100);
  const nameAr = text(nameArValue, 100);
  if (!name && !nameAr) return null;
  const slug = slugify(name || nameAr) || `category-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  const id = `cat_${slug}`;
  await execute(
    `INSERT INTO global_blog_categories (id, slug, name, name_ar)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET name = excluded.name, name_ar = excluded.name_ar`,
    [id, slug, name || nameAr, nameAr || null],
  );
  const row = await queryOne<{ id: string }>('SELECT id FROM global_blog_categories WHERE slug = ?', [slug]);
  return row?.id ?? null;
}

async function upsertTags(raw: unknown): Promise<string[]> {
  const names = [...new Set(text(raw, 1000).split(',').map((name) => name.trim()).filter(Boolean))].slice(0, 12);
  const ids: string[] = [];
  for (const name of names) {
    const slug = slugify(name) || `tag-${globalThis.crypto.randomUUID().slice(0, 8)}`;
    const id = `tag_${slug}`;
    await execute(
      'INSERT OR IGNORE INTO global_blog_tags (id, slug, name) VALUES (?, ?, ?)',
      [id, slug, name.slice(0, 60)],
    );
    const row = await queryOne<{ id: string }>('SELECT id FROM global_blog_tags WHERE slug = ?', [slug]);
    if (row) ids.push(row.id);
  }
  return ids;
}
