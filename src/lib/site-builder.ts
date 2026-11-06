import { queryOne } from '@/lib/db';

export type SiteTemplateId = 'editorial' | 'showroom' | 'minimal';
export type SiteTargetType = 'business' | 'unit';

export interface SiteTemplate {
  id: SiteTemplateId;
  name: string;
  description: string;
  audience: 'both';
  accentColor: string;
  backgroundColor: string;
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'editorial',
    name: 'Editorial Gold',
    description: 'Premium editorial layout with a gold accent.',
    audience: 'both',
    accentColor: '#b28a45',
    backgroundColor: '#f7f4ed',
  },
  {
    id: 'showroom',
    name: 'Showroom Spotlight',
    description: 'A bold, media-led layout for vendor and vehicle pages.',
    audience: 'both',
    accentColor: '#9b7131',
    backgroundColor: '#f1eadb',
  },
  {
    id: 'minimal',
    name: 'Modern Minimal',
    description: 'A quiet, clean layout that puts the published content first.',
    audience: 'both',
    accentColor: '#45413a',
    backgroundColor: '#fbfaf7',
  },
];

export interface SiteProfile {
  templateId: SiteTemplateId;
  layout: SiteTemplateId;
  logoUrl: string | null;
  accentColor: string;
  backgroundColor: string;
}

export async function loadSiteProfile(
  targetType: SiteTargetType,
  targetId: string,
): Promise<SiteProfile> {
  const row = await queryOne<{
    template_id: string;
    logo_url: string | null;
    accent_color: string | null;
    background_color: string | null;
  }>(
    `SELECT template_id, logo_url, accent_color, background_color
       FROM site_profiles WHERE target_type = ? AND target_id = ?`,
    [targetType, targetId],
  );
  const savedTemplateId = targetType === 'business' ? 'editorial' : row?.template_id;
  const template = SITE_TEMPLATES.find((item) => item.id === savedTemplateId) ?? SITE_TEMPLATES[0];
  return {
    templateId: template.id,
    layout: template.id,
    logoUrl: row?.logo_url ?? null,
    accentColor: row?.accent_color || template.accentColor,
    backgroundColor: row?.background_color || template.backgroundColor,
  };
}
