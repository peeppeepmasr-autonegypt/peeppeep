'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BUSINESS_APPLICATIONS } from '@/lib/business-app-catalog';

export default function VendorRegistrationPage() {
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details');

  const [companyName, setCompanyName] = useState('');
  const [companyNameAr, setCompanyNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [typeId, setTypeId] = useState('showroom');
  const [applicationIds, setApplicationIds] = useState<string[]>([]);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdData, setCreatedData] = useState<{
    minisiteUrl: string; dashboardUrl: string; applicationsUrl: string; slug: string;
  } | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/vendor-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          companyName,
          companyNameAr: companyNameAr || companyName,
          phone,
          typeId,
          applicationIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء إرسال الكود');

      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
        setOtpCode(data.demoOtp);
      }
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/vendor-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_register',
          companyName,
          companyNameAr: companyNameAr || companyName,
          phone,
          typeId,
          code: otpCode,
          applicationIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحقق والتسجيل');

      setCreatedData({
        minisiteUrl: data.minisiteUrl,
        dashboardUrl: data.dashboardUrl,
        applicationsUrl: data.applicationsUrl,
        slug: data.slug,
      });
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#0d0f12] flex flex-col justify-between p-4 sm:p-8" dir="rtl">
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-[#c4a265]/20">
        <Link href="/" className="flex items-center gap-3 no-underline text-inherit">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c4a265] to-[#8b7340] flex items-center justify-center font-bold text-black text-base shadow-sm">
            م
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-wide block">AutoPortal</span>
            <span className="text-[11px] text-[#636b75] uppercase tracking-wider block">شبكة تجار السيارات الفاخرة</span>
          </div>
        </Link>
        <Link href="/almostashar" className="text-xs text-[#c4a265] hover:underline font-medium">
          لوحة الإدارة الرئيسية ←
        </Link>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto my-8">
        {step === 'details' && (
          <div className="bg-white/80 border border-[#c4a265]/25 rounded-3xl p-6 sm:p-10 shadow-xl shadow-[#c4a265]/5 backdrop-blur-md">
            <div className="text-center mb-8">
              <span className="inline-block px-3.5 py-1 bg-[#c4a265]/10 border border-[#c4a265]/20 rounded-full text-xs font-semibold text-[#8b7340] mb-3">
                تسجيل مجاني فوري
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0d0f12] mb-3">
                انضم لشبكة معارض السيارات في مصر
              </h1>
              <p className="text-sm text-[#636b75] leading-relaxed max-w-md mx-auto">
                احصل على موقع إلكتروني احترافي فوري تحت اسم معرضك، مع حاسبة تقسيط وكاش كاملة وإمكانية إضافة سياراتك فوراً.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0d0f12] mb-2">
                  اسم المعرض / الشركة (بالعربية)
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: معرض الشروق موتورز"
                  value={companyNameAr}
                  onChange={(e) => setCompanyNameAr(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265] focus:ring-2 focus:ring-[#c4a265]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0d0f12] mb-2">
                  اسم الرابط الإنجليزي (Slug)
                </label>
                <div className="flex items-center rounded-xl border border-[#c4a265]/30 bg-white overflow-hidden focus-within:border-[#c4a265] focus-within:ring-2 focus-within:ring-[#c4a265]/20 transition">
                  <span className="px-3 py-3 bg-[#f2efe9] text-xs text-[#636b75] border-l border-[#c4a265]/20 font-mono">
                    Autofyon.com/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="el-shorouk-motors"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-3 bg-transparent text-sm focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0d0f12] mb-2">
                  نوع النشاط
                </label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#c4a265]/30 rounded-xl text-sm focus:outline-none focus:border-[#c4a265] transition"
                >
                  <option value="showroom">معرض سيارات (Showroom)</option>
                  <option value="distributor">موزع معتمد (Distributor)</option>
                  <option value="main_agency">وكيل رسمي (Main Agency)</option>
                  <option value="used_car_dealer">معرض سيارات مستعملة معتمدة</option>
                  <option value="agent_broker">وسيط سيارات معتمد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0d0f12] mb-2">
                  رقم الهاتف المحمول (لتأكيد واتساب)
                </label>
                <div className="flex items-center rounded-xl border border-[#c4a265]/30 bg-white overflow-hidden focus-within:border-[#c4a265] focus-within:ring-2 focus-within:ring-[#c4a265]/20 transition">
                  <span className="px-3 py-3 bg-[#f2efe9] text-xs font-bold text-[#0d0f12] border-l border-[#c4a265]/20 font-mono">
                    +20
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-3 bg-transparent text-sm focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>
                <span className="text-[11px] text-[#636b75] mt-1.5 block">
                  سنرسل كود تأكيد مباشر إلى حساب واتساب الخاص بهذا الرقم.
                </span>
              </div>

              <fieldset className="space-y-3 rounded-xl border border-[#c4a265]/20 p-4">
                <legend className="px-1 text-xs font-semibold text-[#0d0f12]">
                  تطبيقات AL Mostashar Auto (اختيارية)
                </legend>
                <p className="text-xs leading-6 text-[#636b75]">
                  يُنشأ موقعك المصغّر حتى إن لم تختر أي تطبيق. اختيار التطبيق يرسل طلب ترخيص للمراجعة ولا يفعّله تلقائياً.
                </p>
                {BUSINESS_APPLICATIONS.map((application) => (
                  <label key={application.id} className="flex items-start gap-2 text-sm font-medium normal-case">
                    <input
                      type="checkbox"
                      checked={applicationIds.includes(application.id)}
                      onChange={(event) => setApplicationIds((current) =>
                        event.target.checked
                          ? [...current, application.id]
                          : current.filter((id) => id !== application.id),
                      )}
                      className="mt-1 h-4 w-4 accent-[#9b7131]"
                    />
                    <span>
                      <span className="block">{application.nameAr}</span>
                      <span className="block text-xs font-normal text-[#636b75]">{application.name}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#c4a265] to-[#8b7340] hover:from-[#d1b072] hover:to-[#9e8349] text-black font-semibold text-sm rounded-xl transition duration-200 shadow-lg shadow-[#c4a265]/25 disabled:opacity-50 mt-6"
              >
                {loading ? 'جاري تجهيز الكود...' : 'إرسال كود التأكيد عبر واتساب ←'}
              </button>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <div className="bg-white/80 border border-[#c4a265]/25 rounded-3xl p-6 sm:p-10 shadow-xl shadow-[#c4a265]/5 backdrop-blur-md">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-2xl">
                💬
              </div>
              <h2 className="font-display text-2xl font-bold text-[#0d0f12] mb-2">
                تأكيد رقم الواتساب
              </h2>
              <p className="text-sm text-[#636b75]">
                تم إرسال كود تأكيد مكون من 6 أرقام إلى الرقم{' '}
                <span className="font-bold text-[#0d0f12] font-mono dir-ltr">{phone}</span>
              </p>
            </div>

            {demoOtp && (
              <div className="mb-6 p-4 bg-[#c4a265]/10 border border-[#c4a265]/30 rounded-2xl text-center">
                <span className="text-xs text-[#8b7340] block font-medium mb-1">كود تجريبي جاهز للتأكيد:</span>
                <span className="font-mono text-2xl font-bold tracking-widest text-[#0d0f12]">{demoOtp}</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0d0f12] text-center mb-3">
                  أدخل كود التأكيد (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3.5 bg-white border border-[#c4a265]/30 rounded-2xl focus:outline-none focus:border-[#c4a265] focus:ring-2 focus:ring-[#c4a265]/20 transition"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#c4a265] to-[#8b7340] hover:from-[#d1b072] hover:to-[#9e8349] text-black font-semibold text-sm rounded-xl transition duration-200 shadow-lg shadow-[#c4a265]/25 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق وإنشاء الموقع...' : 'تأكيد وإنشاء موقع المعرض فوراً ✓'}
              </button>

              <button
                type="button"
                onClick={() => setStep('details')}
                className="w-full text-xs text-[#636b75] hover:text-[#0d0f12] transition-colors py-2 text-center"
              >
                تعديل البيانات أو رقم الهاتف
              </button>
            </form>
          </div>
        )}

        {step === 'success' && createdData && (
          <div className="bg-white/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-500/5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0d0f12] mb-2">
              مبروك! تم تفعيل موقع معرضك بنجاح
            </h2>
            <p className="text-sm text-[#636b75] mb-8 max-w-md mx-auto">
              أصبح معرضك الآن جزءاً معتمداً من شبكة السيارات المصرية، وموقعك متاح للجمهور ولإضافة سياراتك.
            </p>

            <div className="p-4 bg-[#f2efe9] rounded-2xl border border-[#c4a265]/20 mb-8 text-right space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#636b75]">رابط موقعك للجمهور:</span>
                <span className="font-mono font-bold text-[#0d0f12]">/{createdData.slug}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#636b75]">حالة الاشتراك:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">مجاني مفعل</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={createdData.minisiteUrl}
                target="_blank"
                rel="noopener"
                className="py-3.5 px-4 rounded-xl border border-[#c4a265] text-[#8b7340] font-bold text-xs hover:bg-[#c4a265]/10 transition flex items-center justify-center gap-2"
              >
                زيارة موقع المعرض ↗
              </a>
              <a
                href={createdData.dashboardUrl}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#c4a265] to-[#8b7340] text-black font-bold text-xs hover:from-[#d1b072] transition flex items-center justify-center gap-2 shadow-md shadow-[#c4a265]/20"
              >
                الدخول للوحة إدارة المعرض وإضافة سياراتك ←
              </a>
              <a
                href={createdData.applicationsUrl}
                className="sm:col-span-2 py-3.5 px-4 rounded-xl border border-[#c4a265]/50 text-[#8b7340] font-bold text-xs hover:bg-[#c4a265]/10 transition"
              >
                إدارة طلبات تراخيص تطبيقات AL Mostashar Auto
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto text-center pt-6 border-t border-[#c4a265]/20 text-xs text-[#636b75]">
        شبكة السيارات المصرية &copy; {new Date().getFullYear()} — منصة المعارض وتجارة السيارات المركزية
      </div>
    </div>
  );
}
