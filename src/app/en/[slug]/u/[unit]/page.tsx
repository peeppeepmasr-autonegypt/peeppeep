/**
 * English unit detail: /en/[sellerSlug]/u/[unitSlug]
 *
 * Mirrors the AR route so a bilingual visitor can move between locales without
 * the URL breaking. Same <UnitView />; only the locale flag and the /en prefix
 * differ.
 */
import { notFound } from 'next/navigation';
import { loadUnit } from '@/lib/units';
import UnitView from '@/components/UnitView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; unit: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { unit: unitSlug } = await params;
  const page = await loadUnit(unitSlug, 'en');
  if (!page) return { title: 'Not found | AutoOne Egypt' };
  return {
    title: `${page.unit.title} — ${page.seller.name}`,
    description: page.model
      ? `${page.model.name} ${page.unit.year ?? ''} ${page.unit.color ?? ''}`
      : `${page.unit.title} from ${page.seller.name}`,
  };
}

export default async function EnglishUnitPage({ params }: Props) {
  const { unit: unitSlug } = await params;
  const page = await loadUnit(unitSlug, 'en');
  if (!page) notFound();
  return <UnitView page={page} locale="en" />;
}
