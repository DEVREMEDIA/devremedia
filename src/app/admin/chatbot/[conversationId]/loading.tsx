import { Skeleton } from '@/components/ui/skeleton';

/** Συνομιλία: φυσαλίδες μηνυμάτων + πλαϊνό πάνελ μεταδεδομένων. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3 rounded-lg bg-muted/30 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className="h-10 w-2/3 rounded-2xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
