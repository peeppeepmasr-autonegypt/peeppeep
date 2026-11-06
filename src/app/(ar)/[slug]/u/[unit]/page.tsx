/**
 * Arabic unit detail: /[sellerSlug]/u/[unitSlug]
 *
 * Thin locale wrapper around <UnitView />. Kept as its own route file so the
 * App Router can statically see the (ar) group and pick the right layout tree.
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
  const page = await loadUnit(unitSlug, 'ar');
  if (!page) return { title: 'غير موجود | AutoOne Egypt' };
  const title = page.unit.title_ar || page.unit.title;
  return {
    title: `${title} — ${page.seller.name_ar || page.seller.name}`,
    description: page.model
      ? `${page.model.name_ar || page.model.name} ${page.unit.year ?? ''} ${page.unit.color_ar || ''}`
      : `${title} من ${page.seller.name_ar || page.seller.name}`,
  };
}

export default async function ArabicUnitPage({ params }: Props) {
  const { unit: unitSlug } = await params;
  const page = await loadUnit(unitSlug, 'ar');
  if (!page) notFound();
  return <UnitView page={page} locale="ar" />;
}
