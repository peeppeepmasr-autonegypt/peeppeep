'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SiteLocale } from '@/lib/site-locale';

export default function PublicLanguageSwitch({ locale }: { locale: SiteLocale }) {
  const pathname = usePathname() ?? '/';
  const languageNames = locale === 'ar'
    ? { arabic: 'العربية', english: 'الإنجليزية' }
    : { arabic: 'Arabic', english: 'English' };
  const arabicPath = locale === 'ar'
    ? pathname
    : pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const englishPath = locale === 'en'
    ? pathname
    : `/en${pathname === '/' ? '' : pathname}`;

  return (
    <span className="public-language-switch" aria-label={locale === 'ar' ? 'اختر اللغة' : 'Choose language'}>
      <Link href={arabicPath} aria-current={locale === 'ar' ? 'page' : undefined}>{languageNames.arabic}</Link>
      <span aria-hidden="true">/</span>
      <Link href={englishPath} aria-current={locale === 'en' ? 'page' : undefined}>{languageNames.english}</Link>
    </span>
  );
}
