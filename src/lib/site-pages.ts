import { query, queryOne, parseJson } from '@/lib/db';

export const SITE_COMPONENT_TYPES = [
  'hero_carousel',
  'model_details',
  'model_lineup',
  'inventory',
  'offers',
  'gallery',
  'blog',
  'finance_calculator',
  'faq',
  'contact',
] as const;

export type SiteComponentType = typeof SITE_COMPONENT_TYPES[number];

export interface SitePageComponent {
  id: string;
  type: SiteComponentType;
  props: {
    title?: string;
    title_ar?: string;
    text?: string;
    text_ar?: string;
    limit?: number;
  };
}

export interface SitePage {
  id: string;
  businessId: string;
  pageType: 'home' | 'custom';
  draftSlug: string;
  draftTitle: string;
  draftTitleAr: string | null;
  draftComponents: SitePageComponent[];
  publishedSlug: string | null;
  publishedTitle: string | null;
  publishedTitleAr: string | null;
  publishedComponents: SitePageComponent[] | null;
  published: boolean;
}

interface SitePageRow {
  id: string;
  business_id: string;
  page_type: 'home' | 'custom';
  draft_slug: string;
  draft_title: string;
  draft_title_ar: string | null;
  draft_components: string;
  published_slug: string | null;
  published_title: string | null;
  published_title_ar: string | null;
  published_components: string | null;
  published: number;
}

export function defaultSiteComponents(): SitePageComponent[] {
  return [
    { id: 'hero-carousel', type: 'hero_carousel', props: {} },
    { id: 'model-details', type: 'model_details', props: {} },
    { id: 'model-lineup', type: 'model_lineup', props: { limit: 12 } },
    { id: 'inventory', type: 'inventory', props: { limit: 12 } },
    { id: 'blog', type: 'blog', props: { limit: 6 } },
    { id: 'contact', type: 'contact', props: {} },
  ];
}

function fromRow(row: SitePageRow): SitePage {
  return {
    id: row.id,
    businessId: row.business_id,
    pageType: row.page_type,
    draftSlug: row.draft_slug,
    draftTitle: row.draft_title,
    draftTitleAr: row.draft_title_ar,
    draftComponents: parseJson<SitePageComponent[]>(row.draft_components, []),
    publishedSlug: row.published_slug,
    publishedTitle: row.published_title,
    publishedTitleAr: row.published_title_ar,
    publishedComponents: row.published_components
      ? parseJson<SitePageComponent[]>(row.published_components, [])
      : null,
    published: row.published === 1,
  };
}

const PAGE_SELECT = `id, business_id, page_type, draft_slug, draft_title, draft_title_ar,
  draft_components, published_slug, published_title, published_title_ar,
  published_components, published`;

export async function listSitePages(businessId: string): Promise<SitePage[]> {
  const rows = await query<SitePageRow>(
    `SELECT ${PAGE_SELECT} FROM site_pages WHERE business_id = ?
      ORDER BY CASE page_type WHEN 'home' THEN 0 ELSE 1 END, draft_title`,
    [businessId],
  );
  return rows.map(fromRow);
}

export async function getPublishedSitePage(
  businessId: string,
  slug = '',
): Promise<SitePage | null> {
  const row = await queryOne<SitePageRow>(
    `SELECT ${PAGE_SELECT} FROM site_pages
      WHERE business_id = ? AND published = 1 AND published_slug = ? LIMIT 1`,
    [businessId, slug],
  );
  return row ? fromRow(row) : null;
}

export async function listPublishedCustomPages(businessId: string): Promise<SitePage[]> {
  const rows = await query<SitePageRow>(
    `SELECT ${PAGE_SELECT} FROM site_pages
      WHERE business_id = ? AND page_type = 'custom' AND published = 1
      ORDER BY draft_title`,
    [businessId],
  );
  return rows.map(fromRow);
}

export function validateSiteComponents(value: unknown): SitePageComponent[] {
  if (!Array.isArray(value) || value.length > 30) {
    throw new Error('A page must contain between 1 and 30 components.');
  }
  const components: SitePageComponent[] = [];
  const ids = new Set<string>();
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid page component.');
    const component = raw as Record<string, unknown>;
    if (typeof component.id !== 'string' || !component.id.trim() || ids.has(component.id)) {
      throw new Error('Each page component needs a unique id.');
    }
    if (!SITE_COMPONENT_TYPES.includes(component.type as SiteComponentType)) {
      throw new Error('Unsupported page component.');
    }
    const rawProps = component.props;
    if (rawProps != null && (typeof rawProps !== 'object' || Array.isArray(rawProps))) {
      throw new Error('Component settings must be an object.');
    }
    const props = (rawProps ?? {}) as Record<string, unknown>;
    const normalizedProps: SitePageComponent['props'] = {};
    for (const key of ['title', 'title_ar', 'text', 'text_ar'] as const) {
      const text = props[key];
      if (text !== undefined) {
        if (typeof text !== 'string' || text.length > 1000) {
          throw new Error('Component text settings must be under 1,000 characters.');
        }
        normalizedProps[key] = text.trim();
      }
    }
    if (props.limit !== undefined) {
      const limit = Number(props.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new Error('Component item limits must be between 1 and 50.');
      }
      normalizedProps.limit = limit;
    }
    ids.add(component.id);
    components.push({
      id: component.id,
      type: component.type as SiteComponentType,
      props: normalizedProps,
    });
    if (index === 0 && component.type !== 'hero_carousel') {
      throw new Error('The hero carousel must be the first component on every page.');
    }
  }
  if (!components.length || components[0].type !== 'hero_carousel') {
    throw new Error('Every page must start with a hero carousel.');
  }
  if (components.filter((component) => component.type === 'hero_carousel').length !== 1) {
    throw new Error('A page must contain exactly one hero carousel.');
  }
  return components;
}

export function normalizePageSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
