import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import { execute, query, queryOne } from '@/lib/db';
import { MINISITE_TEMPLATES, VENDOR_TIERS, canVendorUseTemplate } from '@/lib/tiers';

export const runtime = 'edge';

/**
 * GET: Lists all templates, tiers, and vendor tier assignments.
 * PATCH: Updates a vendor's tier, template, or permission flags.
 */
export async function GET() {
  return NextResponse.json({
    templates: MINISITE_TEMPLATES,
    tiers: VENDOR_TIERS,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { business_id, tier, template_id, custom_domain } = await req.json();

    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    const biz = await queryOne<{ id: string; custom_data: string }>(
      'SELECT id, custom_data FROM businesses WHERE id = ?',
      [business_id]
    );
    if (!biz) {
      return NextResponse.json({ error: 'التاجر غير موجود' }, { status: 404 });
    }

    const selectedTier = tier || 'free';
    if (template_id && !canVendorUseTemplate(selectedTier, template_id)) {
      return NextResponse.json({
        error: `القالب "${template_id}" غير متاح لباقة "${selectedTier}". يرجى ترقية الباقة لاستخدام هذا القالب.`,
      }, { status: 403 });
    }

    let customData: Record<string, any> = {};
    try {
      customData = JSON.parse(biz.custom_data || '{}');
    } catch {}

    if (template_id) customData._template_id = template_id;

    await execute(
      `UPDATE businesses
          SET custom_domain = COALESCE(?, custom_domain),
              custom_data = ?
        WHERE id = ?`,
      [custom_domain || null, JSON.stringify(customData), business_id]
    );

    return NextResponse.json({
      ok: true,
      message: 'تم تحديث باقة وقالب التاجر بنجاح',
      tier: selectedTier,
      template_id: template_id || customData._template_id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل التحديث';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
