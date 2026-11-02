import { notFound } from 'next/navigation';
import { loadMinisite } from '@/lib/minisite';
import MinisiteView from '@/components/MinisiteView';

export const dynamic = 'force-dynamic';

export default async function ArabicMinisiteSection({
  params,
}: {
  params: Promise<{ slug: string; section: string }>;
}) {
  const { slug, section } = await params;
  const view = await loadMinisite(slug, 'ar', section);
  if (!view) notFound();
  return <MinisiteView view={view} />;
}
