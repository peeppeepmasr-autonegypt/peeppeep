import type { ReactNode } from 'react';
import HtmlShell from '@/components/HtmlShell';

export default function JoinLayout({ children }: { children: ReactNode }) {
  return <HtmlShell locale="ar">{children}</HtmlShell>;
}
