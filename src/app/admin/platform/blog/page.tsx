import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import GlobalBlogStudio from '@/components/GlobalBlogStudio';

export default async function PlatformBlogPage() {
  const requestHeaders = await headers();
  const request = new Request('http://localhost/admin/platform/blog', {
    headers: Object.fromEntries(requestHeaders.entries()),
  });
  const user = await getAdminUser(request);
  if (!user || user.role !== 'platform_admin') notFound();
  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><GlobalBlogStudio /></main>;
}
