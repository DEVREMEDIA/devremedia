import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatGrid } from '@/components/shared/stat-grid';

/**
 * Το ίδιο το πλέγμα δανείζεται από το κοινό component — αν αλλάξει εκεί η
 * γεωμετρία, ο σκελετός ακολουθεί μόνος του. Μένει μόνο το πλακίδιο γραμμένο
 * στο χέρι, γιατί δεν υπάρχει τίποτα να δείξει ακόμα.
 */
export function KpiStripSkeleton() {
  return (
    <StatGrid columns={7}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex flex-col bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-2 h-8 w-full" />
        </div>
      ))}
    </StatGrid>
  );
}

export function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
