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

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tb = useTranslations('breadcrumb');

  const segments = pathname.split('/').filter((segment) => segment !== '');

  // Remove 'admin' from segments if present
  const adminIndex = segments.indexOf('admin');
  if (adminIndex !== -1) {
    segments.splice(adminIndex, 1);
  }

  const resolvedLabels = useBreadcrumbLabels(segments);

  // Segment-to-translation-key mapping
  const segmentLabels: Record<string, string> = {
    dashboard: t('dashboard'),
    clients: t('clients'),
    projects: t('projects'),
    invoices: t('invoices'),
    calendar: t('calendar'),
    'filming-prep': t('filmingPrep'),
    'filming-requests': t('filmingRequests'),
    contracts: t('contracts'),
    reports: t('reports'),
    settings: t('settings'),
    leads: t('leads'),
    university: t('university'),
    'sales-resources': t('salesResources'),
    messages: t('messages'),
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">{t('dashboard')}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/admin/${segments.slice(0, index + 1).join('/')}`;
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
