import { NextRequest, NextResponse } from 'next/server';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASS } from '@/lib/admin-auth';
import { createAdminSession } from '@/lib/admin-session';

export const runtime = 'edge';
const runtimeEnv: Record<string, string | undefined> = process.env;

export async function POST(req: NextRequest) {
  if (runtimeEnv.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Direct password login is disabled. Authenticate through the configured identity provider.' },
      { status: 503 },
    );
  }
  try {
    const { email, password } = await req.json();

    if (
      (email === SUPER_ADMIN_EMAIL || email === 'admin@mostasharak.com') &&
      password === SUPER_ADMIN_PASS
    ) {
      const res = NextResponse.json({ ok: true, redirect: '/admin/platform' });
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
      res.cookies.set('admin_session', await createAdminSession(SUPER_ADMIN_EMAIL, expiresAt), {
        path: '/',
        httpOnly: true,
        secure: runtimeEnv.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, redirect: '/almostashar' });
  res.cookies.delete('admin_session');
  return res;
}
