'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { localePath, localeDir, type SiteLocale } from '@/lib/site-locale';
import type { FeaturedItem } from '@/lib/minisite';

export default function HomeListing({
  locale,
  items,
}: {
  locale: SiteLocale;
  items: FeaturedItem[];
}) {
  const isAr = locale === 'ar';
  const [activeTab, setActiveTab] = useState<'all' | 'showrooms' | 'brands'>('all');

  const brands = items.filter((item) => item.type_id === 'vehicle_brand');
  const showrooms = items.filter((item) => item.type_id !== 'vehicle_brand');

  return (
    <main dir={localeDir(locale)} lang={locale} className="min-h-screen bg-[#07090c] text-[#f0f4f8] selection:bg-[#c4a265] selection:text-black font-['Cairo',sans-serif]">
      {/* ════════════════════════════════════════════════════════════
          1. LUXURY HERO SECTION
      ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-white/5 bg-[radial-gradient(circle_at_50%_0%,#1a2430_0%,#07090c_75%)]">
        {/* Subtle Gold Glow Ornaments */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#c4a265]/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute -top-32 right-10 w-96 h-96 bg-[#c4a265]/5 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c4a265]/10 border border-[#c4a265]/30 text-[#dfbe7e] text-xs font-bold tracking-wider mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#dfbe7e] animate-pulse" />
            {isAr ? 'البوابة المركزية الأولى لسوق ومعارض السيارات في مصر' : 'EGYPT PREMIER AUTOMOTIVE MARKETPLACE & VENDOR PORTAL'}
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight md:leading-snug">
            {isAr ? (
              <>
                منصة <span className="bg-gradient-to-r from-[#dfbe7e] via-[#c4a265] to-[#997b42] bg-clip-text text-transparent">AutoFyon</span> الكبرى
                <br />
                ملتقى السيارات الفاخرة وشبكة المعارض الموحدة
              </>
            ) : (
              <>
                The Premier <span className="text-[#dfbe7e]">AutoFyon</span> Automotive Portal
              </>
            )}
          </h1>

          <p className="mt-6 text-base md:text-lg text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? 'تصفح أحدث السيارات المعتمدة والمتاحة للتسليم الفوري من كبرى المعارض والوكلاء، أو انضم كمعرض شريك واستفد من 4 حلول ذكية متكاملة لإدارة مبيعاتك وحساباتك.'
              : 'Discover certified luxury vehicles from top dealerships with live financing tools and full dealer management systems.'}
          </p>

          {/* Unified Search Bar */}
          <div className="mt-10 max-w-2xl mx-auto">
            <form action={localePath(locale, ['cars'])} method="get" className="flex items-center bg-white/[0.04] border border-[#c4a265]/30 rounded-2xl p-2 shadow-2xl backdrop-blur-xl focus-within:border-[#dfbe7e] transition-all">
              <input
                type="search"
                name="q"
                placeholder={isAr ? 'ابحث عن ماركة، موديل، أو اسم المعرض...' : 'Search brand, model, or showroom...'}
                className="w-full bg-transparent px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#dfbe7e] to-[#c4a265] text-black font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
              >
                <span>{isAr ? 'بحث فوري' : 'Search'}</span>
                <span>←</span>
              </button>
            </form>
          </div>

          {/* Quick Direct Links */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-3 text-xs">
            <Link
              href={localePath(locale, ['almostashar'])}
              className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#c4a265]/50 text-white/80 hover:text-white transition-all"
            >
              🚗 {isAr ? 'معرض المستشار أوتو (Almostashar)' : 'Almostashar Auto'}
            </Link>
            <Link
              href={localePath(locale, ['auto-one-egypt'])}
              className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#c4a265]/50 text-white/80 hover:text-white transition-all"
            >
              ⭐ {isAr ? 'أوتو ون مصر (Auto One)' : 'Auto One Egypt'}
            </Link>
            <Link
              href="/admin/platform"
              className="px-4 py-2 rounded-xl bg-[#c4a265]/10 border border-[#c4a265]/30 text-[#dfbe7e] hover:bg-[#c4a265]/20 transition-all font-semibold"
            >
              🔐 {isAr ? 'لوحة تحكم المنصة المركزية' : 'Platform Central Admin'}
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          2. THE 4 CORE VENDOR PRODUCTS SECTION
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 border-b border-white/5 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-[#dfbe7e] font-bold mb-2">
              {isAr ? 'منظومة المعارض الذكية' : 'INTEGRATED SHOWROOM SUITE'}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              {isAr ? 'حلول AutoFyon المتكاملة لشركائنا من المعارض' : 'The 4 Complete Solutions for Auto Showrooms'}
            </h2>
            <p className="mt-3 text-sm md:text-base text-[#94a3b8] max-w-2xl mx-auto">
              {isAr
                ? 'نوفر لأصحاب المعارض والوكلاء منظومة تقنية شاملة من 4 حلول مترابطة تعمل كـ Standalone محلي أو تتصل بالشبكة المركزية بمرونة كاملة.'
                : 'Empowering auto dealers with four standalone & networked tools designed for the Egyptian automotive market.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Solution 1: Dynamic Website & Dashboard */}
            <div className="bg-white/[0.02] border border-white/10 hover:border-[#c4a265] rounded-2xl p-6 transition-all group hover:-translate-y-1.5 duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#dfbe7e]/20 to-[#c4a265]/5 border border-[#c4a265]/30 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                🌐
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#dfbe7e] transition-colors">
                {isAr ? 'موقع المعرض ولوحة التحكم' : 'Showroom Minisite & Dashboard'}
              </h3>
              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed">
                {isAr
                  ? 'موقع فاخر مستقل مخصص لمعرضك بدومين خاص (مثل autonegypt.com) أو سلاج مباشر، مع سلايدر سينمائي لكل سيارة، وحاسبة تقسيط، ولوحة تحكم ديناميكية.'
                  : 'Autonomous branded luxury website with custom domain support, dynamic inventory dashboard, and per-car cinematic carousel.'}
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-semibold text-[#dfbe7e]">
                {isAr ? '✓ دومين خاص + حاسبة التقسيط' : 'Custom domain + installment engine'}
              </div>
            </div>

            {/* Solution 2: Al Mostashar CRM */}
            <div className="bg-white/[0.02] border border-white/10 hover:border-[#c4a265] rounded-2xl p-6 transition-all group hover:-translate-y-1.5 duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#dfbe7e]/20 to-[#c4a265]/5 border border-[#c4a265]/30 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                👥
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#dfbe7e] transition-colors">
                {isAr ? 'نظام علاقات العملاء (CRM)' : 'Al Mostashar Auto CRM'}
              </h3>
              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed">
                {isAr
                  ? 'إدارة العملاء المهتمين بالمشاهدة والطلب، متابعة استفسارات الواتساب لكل سيارة، وتسجيل مواعيد المعاينة وتفضيلات المشترين المستعدين.'
                  : 'Customer relationship tracking, per-car inquiry tracking, test-drive schedules, and automated WhatsApp follow-ups.'}
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-semibold text-[#dfbe7e]">
                {isAr ? '✓ تتبع استفسارات الواتساب والطلبات' : 'WhatsApp lead capture'}
              </div>
            </div>

            {/* Solution 3: Auto Market B2B Network (Free) */}
            <div className="bg-white/[0.02] border border-[#c4a265]/40 hover:border-[#dfbe7e] rounded-2xl p-6 transition-all group hover:-translate-y-1.5 duration-300 relative overflow-hidden bg-gradient-to-b from-[#c4a265]/5 to-transparent">
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-[10px] font-bold">
                {isAr ? 'مجاني لجميع المعارض' : 'FREE FOR ALL VENDORS'}
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#dfbe7e]/20 to-[#c4a265]/5 border border-[#c4a265]/30 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                🔄
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#dfbe7e] transition-colors">
                {isAr ? 'سوق المعارض وشبكة التبادل' : 'Auto Market B2B Network'}
              </h3>
              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed">
                {isAr
                  ? 'شبكة حرة لربط كافة معارض وتجار السيارات في مصر مجاناً. يمكنك إرسال واستقبال طلبات وتوافر السيارات بين المعارض لخدمة زبونك دون تفويت أي بيعة.'
                  : 'Open B2B inter-dealer exchange network. Connect with every Egyptian showroom for free to trade inventory and fulfill buyer demands.'}
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-semibold text-[#10b981]">
                {isAr ? '✓ ربط حر وتبادل سيارات بين المعارض' : 'Free inventory sharing'}
              </div>
            </div>

            {/* Solution 4: Accounting & Contracts ERP */}
            <div className="bg-white/[0.02] border border-white/10 hover:border-[#c4a265] rounded-2xl p-6 transition-all group hover:-translate-y-1.5 duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#dfbe7e]/20 to-[#c4a265]/5 border border-[#c4a265]/30 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#dfbe7e] transition-colors">
                {isAr ? 'برنامج المحاسبة وإدارة المخزون (ERP)' : 'Al Mostashar Accounting ERP'}
              </h3>
              <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed">
                {isAr
                  ? 'برنامج محاسبي متكامل لحسابات المعارض، رأس المال، الأرباح، الشاسيهات، طباعة عقود البيع، سندات القبض، وجدولة الأقساط الشهرية.'
                  : 'Financial ledger, inventory tracking, purchase & cost sheets, chassis management, installment schedules, and contract generation.'}
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-semibold text-[#dfbe7e]">
                {isAr ? '✓ جدار حماية 100% للخصوصية والتكاليف' : 'Zero-leak privacy firewall'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          3. FEATURED SHOWROOMS & BRANDS
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <span className="text-xs font-bold text-[#dfbe7e] tracking-wider uppercase mb-1 block">
              {isAr ? 'شبكة الشركاء المعتمدين' : 'CERTIFIED DEALER NETWORK'}
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              {isAr ? 'المعارض وصالات العرض المشتركة' : 'Featured Showrooms & Brands'}
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg transition-all ${activeTab === 'all' ? 'bg-[#c4a265] text-black font-bold' : 'text-white/70 hover:text-white'}`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setActiveTab('showrooms')}
              className={`px-4 py-1.5 rounded-lg transition-all ${activeTab === 'showrooms' ? 'bg-[#c4a265] text-black font-bold' : 'text-white/70 hover:text-white'}`}
            >
              {isAr ? 'المعارض' : 'Showrooms'}
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`px-4 py-1.5 rounded-lg transition-all ${activeTab === 'brands' ? 'bg-[#c4a265] text-black font-bold' : 'text-white/70 hover:text-white'}`}
            >
              {isAr ? 'العلامات التجارية' : 'Brands'}
            </button>
          </div>
        </div>

        {/* Showrooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'all' || activeTab === 'showrooms' ? showrooms : []).map((item) => (
            <Link
              key={item.id}
              href={localePath(locale, [item.slug])}
              className="bg-white/[0.02] border border-white/10 hover:border-[#c4a265] rounded-2xl p-6 transition-all group hover:-translate-y-1 block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#c4a265]/10 border border-[#c4a265]/20 flex items-center justify-center font-bold text-[#dfbe7e]">
                  {item.name ? item.name[0] : 'S'}
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.04] text-white/60 group-hover:text-[#dfbe7e] transition-colors border border-white/5">
                  {isAr ? 'معرض معتمد' : 'Verified Showroom'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#dfbe7e] transition-colors mb-2">
                {isAr ? (item.name_ar || item.name) : item.name}
              </h3>
              <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
                {isAr
                  ? 'معرض سيارات معتمد يقدم خيارات جديدة ومستعملة مع تسهيلات بنكية وتقسيط مباشر.'
                  : 'Certified automotive showroom offering certified pre-owned & new vehicles.'}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs font-semibold text-[#dfbe7e]">
                <span>{isAr ? 'استعراض سيارات المعرض' : 'View Showroom'}</span>
                <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
              </div>
            </Link>
          ))}

          {(activeTab === 'all' || activeTab === 'brands' ? brands : []).map((item) => (
            <Link
              key={item.id}
              href={localePath(locale, [item.slug])}
              className="bg-white/[0.02] border border-white/10 hover:border-[#c4a265] rounded-2xl p-6 transition-all group hover:-translate-y-1 block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center font-bold text-white">
                  {item.name ? item.name[0] : 'B'}
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.04] text-white/60">
                  {isAr ? 'ماركة سيارات' : 'Automotive Brand'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#dfbe7e] transition-colors mb-2">
                {isAr ? (item.name_ar || item.name) : item.name}
              </h3>
              <p className="text-xs text-[#94a3b8] line-clamp-2">
                {isAr ? 'تصفح كافة موديلات وفئات وتفاصيل أسعار هذه العلامة التجارية.' : 'Explore models and trims.'}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs font-semibold text-[#dfbe7e]">
                <span>{isAr ? 'تصفح الموديلات' : 'Explore Models'}</span>
                <span className="group-hover:translate-x-[-4px] transition-transform">←</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          4. CENTRAL VENDOR PARTNERSHIP CALL-TO-ACTION BANNER
             (Where "انضم كمعرض شريك الآن" and "المشترين المستعدين" belong)
      ════════════════════════════════════════════════════════════ */}
      <section className="py-20 border-t border-b border-white/5 bg-gradient-to-b from-[#0e141d] to-[#07090c] relative overflow-hidden">
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-[#c4a265]/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c4a265]/10 border border-[#c4a265]/30 text-[#dfbe7e] text-xs font-bold mb-4">
            💼 {isAr ? 'لأصحاب المعارض وتجار السيارات' : 'FOR SHOWROOM OWNERS & DEALERS'}
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
            {isAr ? (
              <>
                هل تمتلك معرضاً أو أسطول سيارات؟
                <br />
                <span className="text-[#dfbe7e]">انضم إلى شبكة AutoFyon الآن</span>
              </>
            ) : (
              <>Grow Your Showroom on AutoFyon Platform</>
            )}
          </h2>

          <p className="text-base text-[#94a3b8] leading-relaxed max-w-2xl mx-auto mb-8">
            {isAr
              ? 'احصل على موقعك الفاخر الخاص، وبرنامج المحاسبة والـ ERP، وانضم مجاناً إلى شبكة سوق المعارض لتبادل السيارات أمام آلاف المشترين المستعدين في كافة محافظات مصر.'
              : 'Join the united automotive network. Receive your custom luxury showroom website, full ERP & CRM suite, and connect with serious car buyers today.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/201222597304?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D9%85%D8%AA%D9%84%D9%83%20%D9%85%D8%B9%D8%B1%D8%B6%D8%A7%D9%8B%20%D9%88%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D9%86%D8%B6%D9%85%D8%A7%D9%85%20%D9%83%D9%85%D8%B9%D8%B1%D8%B6%20%D8%B4%D8%B1%D9%8A%D9%83%20%D8%B9%D9%84%D9%89%20AutoFyon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#dfbe7e] to-[#c4a265] text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#c4a265]/20 flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>{isAr ? 'انضم إلينا كمعرض شريك الآن' : 'Join as Partner Showroom Now'}</span>
            </a>

            <Link
              href="/join"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/[0.04] border border-white/20 hover:border-[#c4a265] text-white font-bold text-sm hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2"
            >
              <span>{isAr ? 'تفاصيل الاشتراكات والأنظمة' : 'Plans & Pricing'}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          5. FOOTER
      ════════════════════════════════════════════════════════════ */}
      <footer className="py-12 border-t border-white/5 bg-[#05070a] text-xs text-white/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#dfbe7e] to-[#c4a265] flex items-center justify-center font-bold text-black text-sm">
              A
            </div>
            <div>
              <span className="font-bold text-white text-sm">AutoFyon Platform</span>
              <p className="text-[11px] text-white/40">{isAr ? 'البوابة المركزية الأولى لسوق ومعارض السيارات في مصر' : 'The Automotive Operating System'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href={localePath(locale, ['cars'])} className="hover:text-white transition-colors">{isAr ? 'السيارات' : 'Cars'}</Link>
            <Link href={localePath(locale, ['brands'])} className="hover:text-white transition-colors">{isAr ? 'الماركات' : 'Brands'}</Link>
            <Link href={localePath(locale, ['almostashar'])} className="hover:text-white transition-colors">{isAr ? 'المستشار أوتو' : 'Almostashar'}</Link>
            <Link href="/admin/platform" className="hover:text-[#dfbe7e] transition-colors font-semibold">{isAr ? 'دخول الإدارة' : 'Admin Login'}</Link>
          </div>

          <div className="text-center md:text-left">
            <span>© 2026 AutoFyon.com • جميع الحقوق محفوظة</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
