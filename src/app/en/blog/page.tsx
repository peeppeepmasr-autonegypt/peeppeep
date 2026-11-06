import type { Metadata } from 'next';
import { GlobalBlogIndex, globalBlogMetadata } from '@/components/GlobalBlogPages';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return globalBlogMetadata('en');
}
export default async function EnglishBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  return <GlobalBlogIndex locale="en" searchParams={await searchParams} />;
}
