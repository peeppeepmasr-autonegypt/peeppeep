import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blogPostMetadata, GlobalBlogPostPage } from '@/components/GlobalBlogPages';

export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return blogPostMetadata((await params).slug, 'en');
}
export default async function EnglishBlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await GlobalBlogPostPage({ slug, locale: 'en' });
  if (!page) notFound();
  return page;
}
