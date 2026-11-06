import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import { execute, queryOne } from '@/lib/db';
import { assertNesting, loadTypeRule, TypologyError } from '@/lib/typology';
import { resolveSections } from '@/lib/minisite';

export const runtime = 'edge';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Universal Registry Endpoint:
 * Instantiates any Car or Vendor, automatically resolving their website creation policies,
 * shelves, and default data structures.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const {
      type_id,
      name,
      name_ar,
      parent_business_id,
      slug: customSlug,
      custom_domain,
      service_level = 'template',
      subscription_tier = 'free',
      published = 1,
      initial_values = {},
    } = body;

    if (!type_id || !name) {
      return NextResponse.json({ error: 'type_id and name are required' }, { status: 400 });
    }

    const typeRule = await loadTypeRule(type_id);
    if (!typeRule) {
      return NextResponse.json({ error: `نوع النشاط أو المركبة "${type_id}" غير مسجل في النظام` }, { status: 400 });
    }

    // 1. Enforce Nesting Policy
    if (parent_business_id) {
      const parent = await queryOne<{ type_id: string; name: string }>(
        'SELECT type_id, name FROM businesses WHERE id = ?',
        [parent_business_id]
      );
      if (!parent) {
        return NextResponse.json({ error: 'العقدة الأب المحددة غير موجودة' }, { status: 400 });
      }

      try {
        await assertNesting(parent.type_id, type_id);
      } catch (err: unknown) {
        if (err instanceof TypologyError) {
          return NextResponse.json({ error: err.message }, { status: 409 });
        }
        throw err;
      }
    }

    // 2. Resolve Unique Slug
    const baseSlug = customSlug ? slugify(customSlug) : slugify(name);
    let finalSlug = baseSlug || `node-${Date.now().toString().slice(-6)}`;
    const existingSlug = await queryOne<{ id: string }>('SELECT id FROM businesses WHERE slug = ?', [finalSlug]);
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // 3. Resolve Website Policy & Shelves
    const resolvedShelves = await resolveSections(type_id);
    const shelfIds = resolvedShelves.map((s) => s.id);

    // Initial custom_data structure pre-populated with standard policies
    const isVehicle = type_id.startsWith('vehicle_');
    const autoCustomData: Record<string, Record<string, unknown>> = {
      sec_1_identity: {
        name,
        name_ar: name_ar || name,
        tagline: isVehicle ? 'طراز معتمد رسمياً في مصر' : 'عضو معتمد في شبكة السيارات المصرية',
        tagline_ar: isVehicle ? 'طراز معتمد رسمياً في مصر' : 'عضو معتمد في شبكة السيارات المصرية',
      },
      ...initial_values,
    };

    const businessId = `biz_${type_id.slice(0, 4)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // 4. Create the Node in Database
    await execute(
      `INSERT INTO businesses (
        id, name, name_ar, slug, type_id, status, published,
        parent_business_id, custom_domain, minisite_mode, custom_data
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, 'standalone', ?)`,
      [
        businessId,
        name,
        name_ar || name,
        finalSlug,
        type_id,
        published ? 1 : 0,
        parent_business_id || null,
        custom_domain || null,
        JSON.stringify(autoCustomData),
      ]
    );

    return NextResponse.json({
      ok: true,
      message: 'تم تسجيل الكيان وتفعيل سياسة موقعه بنجاح',
      node: {
        id: businessId,
        name,
        slug: finalSlug,
        type_id,
        is_parent: typeRule.is_parent,
        vendor_claimable: typeRule.vendor_claimable,
        website_policy: {
          minisite_mode: 'standalone',
          shelves_count: shelfIds.length,
          shelves: shelfIds,
          public_url: `/${finalSlug}`,
          en_url: `/en/${finalSlug}`,
        },
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل التسجيل التلقائي';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
