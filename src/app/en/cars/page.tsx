import CarsView, { type CarsSearchParams } from '@/components/CarsView';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<CarsSearchParams>;
}

export default async function EnglishCarsPage({ searchParams }: Props) {
  const sp = await searchParams;
  return <CarsView locale="en" searchParams={sp} />;
}
