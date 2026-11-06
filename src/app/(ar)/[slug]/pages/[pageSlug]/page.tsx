import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadMinisite } from '@/lib/minisite';
import { getPublishedSitePage } from '@/lib/site-pages';
import MinisiteView from '@/components/MinisiteView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const view = await loadMinisite(slug, 'ar');
  if (!view) notFound();
  const page = await getPublishedSitePage(view.business.id, pageSlug);
  if (!page) notFound();
  return { title: page?.publishedTitleAr || view.business.name_ar || 'المركبة' };
}

export default async function ArabicCustomSitePage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const view = await loadMinisite(slug, 'ar');
  if (!view || !(await getPublishedSitePage(view.business.id, pageSlug))) notFound();
  return <MinisiteView view={view} pageSlug={pageSlug} />;
}
