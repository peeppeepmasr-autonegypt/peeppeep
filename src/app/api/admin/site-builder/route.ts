import { NextRequest, NextResponse } from 'next/server';
import { canAccessBusiness, getAdminUser } from '@/lib/admin-auth';
import { execute, queryOne } from '@/lib/db';
import { SITE_TEMPLATES, type SiteTargetType } from '@/lib/site-builder';

export const runtime = 'edge';

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

function isSafeLogoUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function PUT(req: NextRequest) {
  const user = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: {
    targetType?: SiteTargetType;
    targetId?: string;
    templateId?: string;
    logoUrl?: string | null;
    accentColor?: string;
    backgroundColor?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { targetType, targetId } = body;
  if (!targetType || !targetId || !['business', 'unit'].includes(targetType)) {
    return NextResponse.json({ error: 'targetType and targetId are required' }, { status: 400 });
  }
  const templateId = targetType === 'business' ? 'editorial' : body.templateId;
  if (!templateId) return NextResponse.json({ error: 'templateId is required for vehicle pages' }, { status: 400 });
  const template = SITE_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return NextResponse.json({ error: 'unknown template' }, { status: 400 });

  let businessId = targetId;
  if (targetType === 'unit') {
    const unit = await queryOne<{ seller_business_id: string }>(
      'SELECT seller_business_id FROM units WHERE id = ?',
      [targetId],
    );
    if (!unit) return NextResponse.json({ error: 'vehicle not found' }, { status: 404 });
    businessId = unit.seller_business_id;
  } else {
    const business = await queryOne<{ id: string }>('SELECT id FROM businesses WHERE id = ?', [targetId]);
    if (!business) return NextResponse.json({ error: 'business not found' }, { status: 404 });
  }

  if (!canAccessBusiness(user, businessId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const logoUrl = body.logoUrl?.trim() || null;
  const accentColor = body.accentColor ?? template.accentColor;
  const backgroundColor = body.backgroundColor ?? template.backgroundColor;
  if (!isHexColor(accentColor) || !isHexColor(backgroundColor)) {
    return NextResponse.json({ error: 'colors must be six-digit hex values' }, { status: 400 });
  }
  if (logoUrl && (logoUrl.length > 500 || !isSafeLogoUrl(logoUrl))) {
    return NextResponse.json({ error: 'logoUrl must be an HTTPS or same-site URL under 500 characters' }, { status: 400 });
  }

  await execute(
    `INSERT INTO site_profiles
       (target_type, target_id, template_id, logo_url, accent_color, background_color, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(target_type, target_id) DO UPDATE SET
       template_id = excluded.template_id,
       logo_url = excluded.logo_url,
       accent_color = excluded.accent_color,
       background_color = excluded.background_color,
       updated_at = excluded.updated_at`,
    [targetType, targetId, templateId, logoUrl, accentColor, backgroundColor, new Date().toISOString()],
  );
  return NextResponse.json({ ok: true });
}
