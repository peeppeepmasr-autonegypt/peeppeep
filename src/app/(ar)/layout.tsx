import type { ReactNode } from 'react';
import HtmlShell from '@/components/HtmlShell';
import PublicSiteChrome from '@/components/PublicSiteChrome';

/** Arabic root layout: the bare path, right-to-left. */
export default function ArabicRoot({ children }: { children: ReactNode }) {
  return <HtmlShell locale="ar"><PublicSiteChrome locale="ar">{children}</PublicSiteChrome></HtmlShell>;
}
