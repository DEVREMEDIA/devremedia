import type { ReactNode } from 'react';

interface PageHeadingProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

/**
 * Η μοναδική επικεφαλίδα μιας σελίδας. Ο σερίφ ζει εδώ και μόνο εδώ —
 * μέσα στα δεδομένα δουλεύει η mono με στοιχισμένους αριθμούς.
 */
export function PageHeading({ title, subtitle, children }: PageHeadingProps) {
  return (
    <header
      data-slot="page-heading"
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4"
    >
      <div className="min-w-0">
        <h1
          data-slot="page-heading-title"
          className="font-display text-3xl leading-tight font-normal tracking-tight text-balance"
        >
          {title}
        </h1>
        {subtitle ? <div className="mt-1.5 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </header>
  );
}
