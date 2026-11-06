/**
 * GET /api/admin/taxonomy/catalog
 *
 * Returns brands, models, and trims tree for dynamic cascaded dropdowns in the dashboard.
 * Brand -> Models -> Trims
 */
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'edge';

export async function GET() {
  const brands = await query<{ id: string; name: string; name_ar: string | null; slug: string }>(
    `SELECT id, name, name_ar, slug FROM businesses WHERE type_id = 'vehicle_brand' AND status = 'active' ORDER BY name`
  );

  const models = await query<{ id: string; name: string; name_ar: string | null; slug: string; parent_business_id: string }>(
    `SELECT id, name, name_ar, slug, parent_business_id FROM businesses WHERE type_id = 'vehicle_model' AND status = 'active' ORDER BY name`
  );

  const trims = await query<{ id: string; name: string; name_ar: string | null; slug: string; parent_business_id: string }>(
    `SELECT id, name, name_ar, slug, parent_business_id FROM businesses WHERE type_id = 'vehicle_trim' AND status = 'active' ORDER BY name`
  );

  return NextResponse.json({
    brands,
    models,
    trims,
  });
}
