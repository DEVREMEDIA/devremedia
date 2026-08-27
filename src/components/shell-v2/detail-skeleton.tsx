import { Skeleton } from '@/components/ui/skeleton';

/**
 * Σκελετός οθόνης λεπτομέρειας: σύνδεσμος επιστροφής, τίτλος με τη σειρά
 * μεταδεδομένων του, καρτέλες, περιεχόμενο. Το σχήμα ταιριάζει με το
 * `DetailShell` — ένας σκελετός που δεν ταιριάζει κάνει τη σελίδα να πηδά.
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
