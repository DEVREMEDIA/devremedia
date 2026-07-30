import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface SectionTab {
  key: string;
  label: string;
  /** Προαιρετικός μετρητής δίπλα στην ετικέτα */
  count?: number;
}

interface SectionTabsProps {
  basePath: string;
  tabs: SectionTab[];
  active: string;
}

/**
 * Καρτέλες ενότητας οδηγούμενες από το URL (`?tab=`), ώστε κάθε καρτέλα να
 * παραμένει server-rendered και να φορτώνει μόνο τα δικά της δεδομένα.
 * Στο κινητό κυλούν οριζόντια αντί να στοιβάζονται.
 */
export function SectionTabs({ basePath, tabs, active }: SectionTabsProps) {
  return (
    <div
      role="tablist"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={`${basePath}?tab=${tab.key}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors',
              isActive
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
