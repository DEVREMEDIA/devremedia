'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPathSegment as formatSegment } from '@/lib/format';
import { isUuidSegment, useBreadcrumbLabels } from '@/components/shared/use-breadcrumb-labels';

export function SalesmanBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tb = useTranslations('breadcrumb');

  const segments = pathname.split('/').filter((segment) => segment !== '');

  // Remove 'salesman' from segments if present
  const salesmanIndex = segments.indexOf('salesman');
  if (salesmanIndex !== -1) {
    segments.splice(salesmanIndex, 1);
  }

  const resolvedLabels = useBreadcrumbLabels(segments);

  // Segment-to-translation-key mapping
  const segmentLabels: Record<string, string> = {
    dashboard: t('dashboard'),
    leads: t('leads'),
    resources: t('resources'),
    handbook: t('handbook'),
    settings: t('settings'),
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/salesman/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/salesman/${segments.slice(0, index + 1).join('/')}`;
          const parent = segments[index - 1];
          const label =
            segmentLabels[segment] ??
            (isUuidSegment(segment)
              ? (resolvedLabels[segment] ?? (parent && tb.has(parent) ? tb(parent) : '…'))
              : formatSegment(segment));

          return (
            <div key={href} className="flex items-center gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
