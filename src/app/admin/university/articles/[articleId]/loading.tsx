import { Skeleton } from '@/components/ui/skeleton';

/** Άρθρο: τίτλος + γραμμές πεζού κειμένου, όχι πίνακας/κάρτες. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? 'h-4 w-2/3' : 'h-4 w-full'} />
        ))}
      </div>
    </div>
  );
}
