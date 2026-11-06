import type { ReactNode } from 'react';
import HtmlShell from '@/components/HtmlShell';
import PublicSiteChrome from '@/components/PublicSiteChrome';

/** English root layout: the `/en` tree, left-to-right. */
export default function EnglishRoot({ children }: { children: ReactNode }) {
  return <HtmlShell locale="en"><PublicSiteChrome locale="en">{children}</PublicSiteChrome></HtmlShell>;
}
