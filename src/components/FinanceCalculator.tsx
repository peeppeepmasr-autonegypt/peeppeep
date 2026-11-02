'use client';

import { useState, useMemo } from 'react';
import type { SiteLocale } from '@/lib/site-locale';

interface FinanceCalculatorProps {
  price: number;
  locale: SiteLocale;
}

interface BankOption {
  id: string;
  name: { en: string; ar: string };
  rate: number; // annual flat %
  minDownPct: number;
  maxMonths: number;
  adminFeePct: number;
}

const BANKS: BankOption[] = [
  {
    id: 'cib',
    name: { en: 'CIB Auto Loan', ar: 'قرض سيارات البنك التجاري الدولي (CIB)' },
    rate: 18.5,
    minDownPct: 20,
    maxMonths: 60,
    adminFeePct: 1.5,
  },
  {
    id: 'contact',
    name: { en: 'Contact Consumer Finance', ar: 'كونتكت للتمويل الاستهلاكي' },
    rate: 21.0,
    minDownPct: 15,
    maxMonths: 72,
    adminFeePct: 2.0,
  },
  {
    id: 'direct_inhouse',
    name: { en: 'Showroom Direct Installment', ar: 'تقسيط مباشر من المعرض (شيكات)' },
    rate: 16.0,
    minDownPct: 30,
    maxMonths: 48,
    adminFeePct: 0.0,
  },
];

export default function FinanceCalculator({ price, locale }: FinanceCalculatorProps) {
  const isAr = locale === 'ar';

  const [paymentMode, setPaymentMode] = useState<'cash' | 'finance'>('finance');
  const [downPaymentPct, setDownPaymentPct] = useState<number>(30);
  const [tenureMonths, setTenureMonths] = useState<number>(36);

  const downPaymentAmount = useMemo(() => {
    return Math.round((price * downPaymentPct) / 100);
  }, [price, downPaymentPct]);

  const financedAmount = useMemo(() => {
    return price - downPaymentAmount;
  }, [price, downPaymentAmount]);

  // Calculations for each provider
  const plans = useMemo(() => {
    return BANKS.map((bank) => {
      const years = tenureMonths / 12;
      const totalInterest = financedAmount * (bank.rate / 100) * years;
      const totalPayable = financedAmount + totalInterest;
      const monthlyInstallment = Math.round(totalPayable / tenureMonths);
      const adminFees = Math.round((financedAmount * bank.adminFeePct) / 100);

      return {
        ...bank,
        monthlyInstallment,
        totalInterest: Math.round(totalInterest),
        totalPayable: Math.round(totalPayable),
        adminFees,
      };
    });
  }, [financedAmount, tenureMonths]);

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-6 bg-black/[.02] dark:bg-white/[.02] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-black/10 dark:border-white/10 pb-4">
        <div>
          <h3 className="text-xl font-bold">
            {isAr ? 'حاسبة التمويل والشراء' : 'Payment & Finance Calculator'}
          </h3>
          <p className="text-xs opacity-60 mt-0.5">
            {isAr
              ? 'قارن بين الدفع الكاش، التقسيط المباشر، وبنوك التمويل المعتمدة'
              : 'Compare Cash, Showroom In-House Credit, and Certified Bank Loans'}
          </p>
        </div>

        {/* Cash vs Installment Mode Selector */}
        <div className="inline-flex rounded-lg border border-black/10 dark:border-white/15 p-1 bg-white dark:bg-black text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPaymentMode('cash')}
            className={`px-3 py-1.5 rounded-md transition ${
              paymentMode === 'cash'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            {isAr ? 'كاش ونقداً' : 'Direct Cash'}
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('finance')}
            className={`px-3 py-1.5 rounded-md transition ${
              paymentMode === 'finance'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            {isAr ? 'تقسيط وتمويل' : 'Installment & Loans'}
          </button>
        </div>
      </div>

      {paymentMode === 'cash' ? (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-sm space-y-2">
          <div className="flex justify-between font-bold text-base">
            <span>{isAr ? 'سعر الشراء الفوري:' : 'Cash Purchase Price:'}</span>
            <span className="text-green-700 dark:text-green-400">
              {price.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}
            </span>
          </div>
          <p className="opacity-70 text-xs">
            {isAr
              ? '✓ تسليم فوري للسيارة مع نقل الملكية مباشرة وخصم خاص للدفع النقدي.'
              : '✓ Immediate vehicle delivery with direct ownership transfer and special cash discount.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Down Payment Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">{isAr ? 'المقدم:' : 'Down Payment:'}</span>
                <span className="font-semibold">
                  {downPaymentPct}% ({downPaymentAmount.toLocaleString()} {isAr ? 'جنيه' : 'EGP'})
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="70"
                step="5"
                value={downPaymentPct}
                onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                className="w-full accent-black dark:accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] opacity-40">
                <span>15%</span>
                <span>70%</span>
              </div>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">{isAr ? 'مدة التقسيط:' : 'Loan Duration:'}</span>
                <span className="font-semibold">
                  {tenureMonths} {isAr ? 'شهر' : 'Months'} ({tenureMonths / 12} {isAr ? 'سنوات' : 'Years'})
                </span>
              </div>
              <input
                type="range"
                min="12"
                max="60"
                step="12"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full accent-black dark:accent-white cursor-pointer"
              />
              <div className="flex justify-between text-[10px] opacity-40">
                <span>12 {isAr ? 'شهر' : 'Mo'}</span>
                <span>60 {isAr ? 'شهر' : 'Mo'}</span>
              </div>
            </div>
          </div>

          {/* Bank / Funder Comparison Cards */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider opacity-60">
              {isAr ? 'خيارات جهات التمويل المتاحة' : 'Available Financing Offers'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-black/10 dark:border-white/15 p-4 flex flex-col justify-between space-y-3 bg-white dark:bg-neutral-900 shadow-sm"
                >
                  <div>
                    <div className="font-bold text-sm leading-snug">{isAr ? p.name.ar : p.name.en}</div>
                    <div className="text-[11px] opacity-50 mt-0.5">
                      {isAr ? `فائدة سنوية: ${p.rate}%` : `Annual Interest: ${p.rate}%`}
                    </div>
                  </div>

                  <div className="border-t border-black/5 dark:border-white/10 pt-2">
                    <div className="text-xs opacity-60">{isAr ? 'القسط الشهري' : 'Monthly Payment'}</div>
                    <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                      {p.monthlyInstallment.toLocaleString()} <span className="text-xs font-normal">{isAr ? 'جنيه/شهر' : 'EGP/mo'}</span>
                    </div>
                  </div>

                  <div className="text-[11px] opacity-60 flex justify-between border-t border-black/5 dark:border-white/10 pt-1.5">
                    <span>{isAr ? 'إجمالي الفائدة:' : 'Total Interest:'}</span>
                    <span>{p.totalInterest.toLocaleString()} {isAr ? 'جنيه' : 'EGP'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
