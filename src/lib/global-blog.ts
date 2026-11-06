import { query, queryOne } from '@/lib/db';
import type { SiteLocale } from '@/lib/site-locale';

export interface GlobalBlogCategory {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  color: string;
  post_count?: number;
}

export interface GlobalBlogTag {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  post_count?: number;
}

export interface GlobalBlogPost {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  excerpt: string | null;
  excerpt_ar: string | null;
  content: string;
  content_ar: string;
  featured_image_url: string | null;
  author_name: string;
  category_id: string | null;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  seo_title: string | null;
  seo_title_ar: string | null;
  seo_description: string | null;
  seo_description_ar: string | null;
  meta_keywords: string | null;
  reading_time: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
  category_name_ar?: string | null;
  category_slug?: string | null;
  tags?: GlobalBlogTag[];
}

export const BLOG_WIDGETS = ['carousel', 'search', 'recent', 'categories', 'tags'] as const;
export type BlogWidget = typeof BLOG_WIDGETS[number];

export function localized<T extends object, K extends keyof T>(
  row: T,
  english: K,
  arabic: K,
  locale: SiteLocale,
): string {
  const primary = row[locale === 'ar' ? arabic : english];
  return typeof primary === 'string' ? primary.trim() : '';
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function excerptFor(post: GlobalBlogPost, locale: SiteLocale): string {
  const excerpt = localized(post, 'excerpt', 'excerpt_ar', locale);
  if (excerpt) return excerpt;
  const content = localized(post, 'content', 'content_ar', locale);
  return content.replace(/[#*_`[\]()!>-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function visiblePostClause(alias = ''): string {
  const p = alias ? `${alias}.` : '';
  return `(${p}status = 'published' OR (${p}status = 'scheduled' AND datetime(${p}published_at) <= CURRENT_TIMESTAMP))`;
}

export async function listPublishedPosts(
  locale: SiteLocale,
  options: { search?: string; category?: string; tag?: string; limit?: number } = {},
): Promise<GlobalBlogPost[]> {
  const where = [visiblePostClause('p')];
  const params: unknown[] = [];
  const search = options.search?.trim().slice(0, 120);
  if (search) {
    where.push(`(p.title LIKE ? OR p.title_ar LIKE ? OR p.excerpt LIKE ? OR p.excerpt_ar LIKE ?)`);
    const needle = `%${search}%`;
    params.push(needle, needle, needle, needle);
  }
  if (options.category) {
    where.push('c.slug = ?');
    params.push(options.category);
  }
  if (options.tag) {
    where.push(`EXISTS (
      SELECT 1 FROM global_blog_post_tags pt
      JOIN global_blog_tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id AND t.slug = ?
    )`);
    params.push(options.tag);
  }
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);
  params.push(limit);
  return query<GlobalBlogPost>(
    `SELECT p.*, c.name AS category_name, c.name_ar AS category_name_ar, c.slug AS category_slug
       FROM global_blog_posts p
       LEFT JOIN global_blog_categories c ON c.id = p.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
      LIMIT ?`,
    params,
  );
}

export async function getPublishedPost(slug: string): Promise<GlobalBlogPost | null> {
  const post = await queryOne<GlobalBlogPost>(
    `SELECT p.*, c.name AS category_name, c.name_ar AS category_name_ar, c.slug AS category_slug
       FROM global_blog_posts p
       LEFT JOIN global_blog_categories c ON c.id = p.category_id
      WHERE p.slug = ? AND ${visiblePostClause('p')}
      LIMIT 1`,
    [slug],
  );
  if (!post) return null;
  post.tags = await query<GlobalBlogTag>(
    `SELECT t.id, t.slug, t.name, t.name_ar
       FROM global_blog_tags t
       JOIN global_blog_post_tags pt ON pt.tag_id = t.id
      WHERE pt.post_id = ?
      ORDER BY t.name`,
    [post.id],
  );
  return post;
}

export async function listBlogCategories(): Promise<GlobalBlogCategory[]> {
  return query<GlobalBlogCategory>(
    `SELECT c.id, c.slug, c.name, c.name_ar, c.description, c.description_ar, c.color,
            COUNT(p.id) AS post_count
       FROM global_blog_categories c
       LEFT JOIN global_blog_posts p ON p.category_id = c.id AND ${visiblePostClause('p')}
      GROUP BY c.id
      ORDER BY c.sort_order, c.name`,
  );
}

export async function listBlogTags(): Promise<GlobalBlogTag[]> {
  return query<GlobalBlogTag>(
    `SELECT t.id, t.slug, t.name, t.name_ar, COUNT(pt.post_id) AS post_count
       FROM global_blog_tags t
       JOIN global_blog_post_tags pt ON pt.tag_id = t.id
       JOIN global_blog_posts p ON p.id = pt.post_id AND ${visiblePostClause('p')}
      GROUP BY t.id
      ORDER BY post_count DESC, t.name
      LIMIT 30`,
  );
}

export function markdownToSafeHtml(markdown: string): string {
  const escape = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const safeUrl = (value: string) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
      return null;
    }
  };

  const inline = (line: string) => {
    let text = escape(line);
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, (_match, alt: string, url: string) => {
      const safe = safeUrl(url);
      return safe ? `<img src="${escape(safe)}" alt="${alt}" loading="lazy">` : alt;
    });
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, (_match, label: string, url: string) => {
      const safe = safeUrl(url) ?? (/^mailto:[^\s]+$/i.test(url) ? url : null);
      return safe ? `<a href="${escape(safe)}" rel="nofollow noopener noreferrer">${label}</a>` : label;
    });
    return text;
  };

  const blocks: string[] = [];
  let paragraph: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(`</${list}>`);
    list = null;
  };

  for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const item = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (!line) { flushParagraph(); flushList(); continue; }
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(heading[1].length + 1, 4);
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (line.startsWith('> ')) {
      flushParagraph(); flushList();
      blocks.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else if (item) {
      flushParagraph();
      const nextList = /^\d/.test(item[1]) ? 'ol' : 'ul';
      if (list !== nextList) { flushList(); blocks.push(`<${nextList}>`); list = nextList; }
      blocks.push(`<li>${inline(item[2])}</li>`);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks.join('\n');
}
