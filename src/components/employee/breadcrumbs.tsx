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

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const segments = pathname.split('/').filter((segment) => segment !== '');

  // Remove 'employee' from segments if present
  const employeeIndex = segments.indexOf('employee');
  if (employeeIndex !== -1) {
    segments.splice(employeeIndex, 1);
  }

  // Segment-to-translation-key mapping
  const segmentLabels: Record<string, string> = {
    dashboard: t('dashboard'),
    tasks: t('myTasks'),
    university: t('university'),
    settings: t('settings'),
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/employee/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/employee/${segments.slice(0, index + 1).join('/')}`;
          const label = segmentLabels[segment] || formatSegment(segment);

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
