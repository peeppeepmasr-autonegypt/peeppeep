import { NextRequest, NextResponse } from 'next/server';
import { batch, queryOne } from '@/lib/db';
import { createAdminSession } from '@/lib/admin-session';
import { BUSINESS_APPLICATIONS, type BusinessApplicationId } from '@/lib/business-app-catalog';

export const runtime = 'edge';

// Memory/demo store for WhatsApp verification codes in dev environment
const OTP_STORE = new Map<string, { code: string; expires: number }>();

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `vendor-${Date.now().toString().slice(-4)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, phone, companyName, companyNameAr, typeId, code } = body;

    const normalizedPhone = (phone || '').replace(/\D/g, '');
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'رقم هاتف غير صحيح. يرجى إدخال رقم هاتف صالح.' }, { status: 400 });
    }

    // ACTION 1: Send WhatsApp OTP
    if (action === 'send_otp') {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'WhatsApp verification is not configured. Registration is temporarily unavailable.' },
          { status: 503 },
        );
      }
      if (!companyName && !companyNameAr) {
        return NextResponse.json({ error: 'يرجى إدخال اسم الشركة أو المعرض' }, { status: 400 });
      }

      const randomValue = new Uint32Array(1);
      crypto.getRandomValues(randomValue);
      const generatedCode = String(100000 + (randomValue[0] % 900000));
      OTP_STORE.set(normalizedPhone, {
        code: generatedCode,
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      return NextResponse.json({
        ok: true,
        message: 'تم إنشاء كود التحقق للتجربة المحلية',
        demoOtp: generatedCode,
        expiresInSeconds: 600,
      });
    }

    // ACTION 2: Verify OTP & Create Vendor Minisite
    if (action === 'verify_and_register') {
      const stored = OTP_STORE.get(normalizedPhone);

      if (!stored || stored.expires <= Date.now() || stored.code !== code) {
        return NextResponse.json({ error: 'كود التأكيد غير صحيح أو انتهت صلاحيته' }, { status: 400 });
      }
      const requestedApplications = Array.isArray(body.applicationIds)
        ? [...new Set(body.applicationIds)]
        : [];
      if (requestedApplications.some((id) =>
        !BUSINESS_APPLICATIONS.some((application) => application.id === id),
      )) {
        return NextResponse.json({ error: 'اختيار تطبيق غير صالح' }, { status: 400 });
      }

      const businessId = `biz_v_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const rawSlug = companyName ? generateSlug(companyName) : `showroom-${normalizedPhone.slice(-4)}`;
      
      // Ensure unique slug
      let finalSlug = rawSlug;
      const slugExists = await queryOne<{ id: string }>('SELECT id FROM businesses WHERE slug = ?', [finalSlug]);
      if (slugExists) {
        finalSlug = `${rawSlug}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const selectedType = typeId || 'showroom';
      const vendorEmail = `vendor_${normalizedPhone}@autonegypt.local`;
      const existingUser = await queryOne<{
        id: string;
        role: string;
        scope_ids: string;
      }>('SELECT id, role, scope_ids FROM admin_users WHERE email = ? AND active = 1', [vendorEmail]);
      if (existingUser && existingUser.role !== 'vendor') {
        return NextResponse.json({ error: 'لا يمكن استخدام هذا الرقم لحساب إداري' }, { status: 409 });
      }
      let existingScopes: string[] = [];
      try {
        existingScopes = existingUser ? JSON.parse(existingUser.scope_ids) as string[] : [];
      } catch {
        return NextResponse.json({ error: 'تعذر التحقق من صلاحيات الحساب الحالي' }, { status: 500 });
      }
      const adminUserId = existingUser?.id ?? `usr_${businessId}`;
      const scopes = [...new Set([...existingScopes, businessId])];
      const initialCustomData = JSON.stringify({
        sec_1_identity: {
          name: companyName || companyNameAr,
          name_ar: companyNameAr || companyName,
          tagline: 'عضو شبكة السيارات المصرية المعتمدة',
          tagline_ar: 'عضو شبكة السيارات المصرية المعتمدة',
        },
        sec_auto_showroom: {
          phone: `+20${normalizedPhone.replace(/^20|^0/, '')}`,
          opening_hours: '10:00 AM - 10:00 PM',
          opening_hours_ar: '١٠:٠٠ ص - ١٠:٠٠ م',
        },
      });

      const statements = [
        {
          sql: `INSERT INTO businesses (
          id, name, name_ar, slug, type_id, status, published,
          minisite_mode, service_level, subscription_tier, custom_data
        ) VALUES (?, ?, ?, ?, ?, 'active', 1, 'standalone', 'template', 'free', ?)`,
          params: [
            businessId, companyName || companyNameAr, companyNameAr || companyName,
            finalSlug, selectedType, initialCustomData,
          ],
        },
        {
          sql: `INSERT INTO admin_users (
          id, email, name, role, scope_ids, active
        ) VALUES (?, ?, ?, 'vendor', ?, 1)
        ON CONFLICT(email) DO UPDATE SET scope_ids = excluded.scope_ids, active = 1`,
          params: [
            adminUserId, vendorEmail, companyNameAr || companyName, JSON.stringify(scopes),
          ],
        },
        {
          sql: `INSERT INTO business_memberships (id, business_id, admin_user_id, role, status)
                VALUES (?, ?, ?, 'owner', 'active')
                ON CONFLICT(business_id, admin_user_id) DO UPDATE SET role = 'owner', status = 'active',
                  updated_at = CURRENT_TIMESTAMP`,
          params: [`member_${businessId}_${adminUserId}`, businessId, adminUserId],
        },
        {
          sql: `INSERT INTO site_profiles
                  (target_type, target_id, template_id, accent_color, background_color, updated_at)
                VALUES ('business', ?, 'editorial', '#b28a45', '#f7f4ed', ?)`,
          params: [businessId, new Date().toISOString()],
        },
        ...requestedApplications.map((applicationId) => ({
          sql: `INSERT INTO business_app_licenses (id, business_id, application_id, status, updated_at)
                VALUES (?, ?, ?, 'requested', ?)
                ON CONFLICT(business_id, application_id) DO NOTHING`,
          params: [
            `app_${businessId}_${applicationId}`,
            businessId,
            applicationId as BusinessApplicationId,
            new Date().toISOString(),
          ],
        })),
      ];
      await batch(statements);

      // Consume OTP
      OTP_STORE.delete(normalizedPhone);

      const res = NextResponse.json({
        ok: true,
        businessId,
        slug: finalSlug,
        minisiteUrl: `/${finalSlug}`,
        dashboardUrl: `/admin/showroom/${businessId}`,
        applicationsRequested: requestedApplications,
        applicationsUrl: `/admin/showroom/${businessId}/applications`,
      });

      // Set session cookie so the vendor is immediately logged in
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      res.cookies.set('admin_session', await createAdminSession(vendorEmail, expiresAt), {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return res;
    }

    return NextResponse.json({ error: 'إجراء غير مدعوم' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل التسجيل';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
