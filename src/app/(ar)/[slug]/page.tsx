import { notFound } from 'next/navigation';
import { loadMinisite } from '@/lib/minisite';
import MinisiteView from '@/components/MinisiteView';

export const dynamic = 'force-dynamic';

export default async function ArabicMinisite({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const view = await loadMinisite(slug, 'ar');
  if (!view) notFound();
  return <MinisiteView view={view} />;
}
