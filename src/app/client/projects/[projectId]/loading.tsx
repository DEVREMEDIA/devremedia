import { DetailSkeleton } from '@/components/shell-v2/detail-skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 sm:px-6">
      <DetailSkeleton />
    </div>
  );
}
