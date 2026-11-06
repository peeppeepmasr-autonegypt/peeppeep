import type { Metadata } from 'next';
import { GlobalBlogIndex, globalBlogMetadata } from '@/components/GlobalBlogPages';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return globalBlogMetadata('ar');
}
export default async function ArabicBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  return <GlobalBlogIndex locale="ar" searchParams={await searchParams} />;
}
