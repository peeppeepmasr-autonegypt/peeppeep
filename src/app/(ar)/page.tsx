import { listFeatured } from '@/lib/minisite';
import HomeListing from '@/components/HomeListing';

// Data comes from D1 at request time; nothing here is statically prerendered.
export const dynamic = 'force-dynamic';

export default async function ArabicHome() {
  const items = await listFeatured();
  return <HomeListing locale="ar" items={items} />;
}
