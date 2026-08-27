import { Skeleton } from '@/components/ui/skeleton';
import { KpiStripSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';

/** Ό,τι υπάρχει πριν το πρώτο όριο: η επικεφαλίδα και η λωρίδα αριθμών. */
export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <KpiStripSkeleton />
    </div>
  );
}
