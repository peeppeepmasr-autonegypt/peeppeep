/**
 * POST /api/admin/taxonomy/feed
 *
 * Platform Admin API to dynamically seed or add:
 * - A new Brand (e.g. Mercedes, Toyota, Porsche)
 * - A new Model under a brand (e.g. C-Class, Land Cruiser, 911)
 * - A new Trim under a model (e.g. C200 AMG, GR Sport, GT3 RS)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import { createBusinessNode } from '@/lib/business-creation';
import { TypologyError } from '@/lib/typology';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;

  let body: {
    type: 'brand' | 'model' | 'trim';
    name: string;
    name_ar?: string;
    parent_id?: string; // required for model (brand id) and trim (model id)
    custom_data?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { type, name, name_ar, parent_id, custom_data = {} } = body;

  if (!name || !type) {
    return NextResponse.json({ error: 'name and type are required' }, { status: 400 });
  }

  const typeMap: Record<string, string> = {
    brand: 'vehicle_brand',
    model: 'vehicle_model',
    trim: 'vehicle_trim',
  };

  const businessTypeId = typeMap[type];
  if (!businessTypeId) {
    return NextResponse.json({ error: 'invalid type. allowed: brand, model, trim' }, { status: 400 });
  }

  if ((type === 'model' || type === 'trim') && !parent_id) {
    return NextResponse.json({ error: `parent_id is required when adding a ${type}` }, { status: 400 });
  }

  try {
    const node = await createBusinessNode({
      name,
      name_ar: name_ar || null,
      type_id: businessTypeId,
      parent_business_id: parent_id || null,
      custom_data,
      published: true,
      // The platform team owns reference data: brand, model and trim are the
      // kinds a vendor may link to but never invent for itself.
      actor_role: auth.user.role,
    });

    return NextResponse.json({ success: true, node }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // A typology refusal (a model under a showroom, a car as a node) is a
    // conflict with the data model, not a malformed request.
    if (err instanceof TypologyError) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
