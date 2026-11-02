import { listFeatured } from '@/lib/minisite';
import HomeListing from '@/components/HomeListing';

export const dynamic = 'force-dynamic';

export default async function EnglishHome() {
  const items = await listFeatured();
  return <HomeListing locale="en" items={items} />;
}
