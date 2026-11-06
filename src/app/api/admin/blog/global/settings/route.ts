import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin-auth';
import { execute } from '@/lib/db';
import { BLOG_WIDGETS, type BlogWidget } from '@/lib/global-blog';

export const runtime = 'edge';

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof Response) return auth;
  let body: { widgets?: unknown };
  try { body = await req.json() as { widgets?: unknown }; } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!Array.isArray(body.widgets)) {
    return NextResponse.json({ error: 'widgets must be an array.' }, { status: 400 });
  }
  const widgets = [...new Set(body.widgets.filter(
    (value): value is BlogWidget => typeof value === 'string' && BLOG_WIDGETS.includes(value as BlogWidget),
  ))];
  await execute(
    `INSERT INTO global_blog_settings (id, widgets, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET widgets = excluded.widgets, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(widgets)],
  );
  return NextResponse.json({ ok: true, widgets });
}
