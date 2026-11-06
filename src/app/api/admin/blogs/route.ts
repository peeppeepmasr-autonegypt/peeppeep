/**
 * /api/admin/blogs — CRUD for section_blogs.
 *
 * GET   ?business_id=X&section_id=Y  → list blogs
 * POST  { business_id, section_id, title, title_ar, content, content_ar, ... }  → create
 * PATCH { id, ...updates }           → update entry
 * DELETE { id }                     → delete entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessAccess } from '@/lib/admin-auth';
import { execute, query, queryOne } from '@/lib/db';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('business_id');
  const sectionId = req.nextUrl.searchParams.get('section_id');
  if (!businessId) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
  }

  const auth = await requireBusinessAccess(req, businessId);
  if (auth instanceof Response) return auth;

  let sql = 'SELECT id, section_id, title, title_ar, content, content_ar, status, show_on_minisite FROM section_blogs WHERE business_id = ?';
  const params: unknown[] = [businessId];
  if (sectionId) {
    sql += ' AND section_id = ?';
    params.push(sectionId);
  }
  sql += ' ORDER BY rowid DESC';

  const rows = await query(sql, params);
  return NextResponse.json({ blogs: rows });
}

export async function POST(req: NextRequest) {
  let body: {
    business_id?: string;
    section_id?: string;
    title?: string;
    title_ar?: string;
    content?: string;
    content_ar?: string;
    status?: string;
    show_on_minisite?: number;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { business_id, section_id } = body;
  if (!business_id || !section_id) {
    return NextResponse.json({ error: 'business_id and section_id are required' }, { status: 400 });
  }

  const auth = await requireBusinessAccess(req, business_id);
  if (auth instanceof Response) return auth;

  const id = `blog_${globalThis.crypto.randomUUID().slice(0, 12)}`;
  // Vendors create as 'pending' by default; admins publish immediately
  const status = auth.user.role === 'platform_admin'
    ? (body.status ?? 'published')
    : (body.status === 'published' ? 'pending' : (body.status ?? 'draft'));

  await execute(
    `INSERT INTO section_blogs
       (id, business_id, section_id, title, title_ar, content, content_ar, status, show_on_minisite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, business_id, section_id,
      body.title ?? null,
      body.title_ar ?? null,
      body.content ?? null,
      body.content_ar ?? null,
      status,
      body.show_on_minisite ?? 1,
    ],
  );

  return NextResponse.json({ ok: true, id, status }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let body: {
    id?: string;
    title?: string;
    title_ar?: string;
    content?: string;
    content_ar?: string;
    status?: string;
    show_on_minisite?: number;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await queryOne<{ business_id: string; status: string }>(
    'SELECT business_id, status FROM section_blogs WHERE id = ?', [id],
  );
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const auth = await requireBusinessAccess(req, row.business_id);
  if (auth instanceof Response) return auth;

  // Build dynamic SET
  const fields: string[] = [];
  const vals: unknown[] = [];
  const allowed = ['title', 'title_ar', 'content', 'content_ar', 'show_on_minisite'];
  for (const key of allowed) {
    if (key in body && body[key as keyof typeof body] !== undefined) {
      fields.push(`${key} = ?`);
      vals.push(body[key as keyof typeof body]);
    }
  }
  // Status transitions
  if (body.status !== undefined) {
    // Vendors cannot directly publish — set to 'pending' instead
    const effectiveStatus = auth.user.role !== 'platform_admin' && body.status === 'published'
      ? 'pending'
      : body.status;
    fields.push('status = ?');
    vals.push(effectiveStatus);
  }

  if (!fields.length) return NextResponse.json({ error: 'no fields to update' }, { status: 400 });

  vals.push(id);
  await execute(`UPDATE section_blogs SET ${fields.join(', ')} WHERE id = ?`, vals);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let body: { id?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await queryOne<{ business_id: string }>(
    'SELECT business_id FROM section_blogs WHERE id = ?', [id],
  );
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const auth = await requireBusinessAccess(req, row.business_id);
  if (auth instanceof Response) return auth;

  await execute('DELETE FROM section_blogs WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
