import type { ReactNode } from 'react';
import HtmlShell from '@/components/HtmlShell';

/** Arabic root layout: the bare path, right-to-left. */
export default function ArabicRoot({ children }: { children: ReactNode }) {
  return <HtmlShell locale="ar">{children}</HtmlShell>;
}
