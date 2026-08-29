import { Skeleton } from '@/components/ui/skeleton';

/** Άρθρο: breadcrumb + τίτλος + γραμμές πεζού κειμένου. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-56" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? 'h-4 w-2/3' : 'h-4 w-full'} />
        ))}
      </div>
    </div>
  );
}
