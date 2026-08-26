'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/data-table';
import type { ClientRevenue } from '@/lib/queries/reports';
import { formatEur as formatCurrency } from '@/lib/format';
import { CHART_PRIMARY } from '@/lib/chart-colors';

type ClientReportProps = {
  topClients: ClientRevenue[];
};

export function ClientReport({ topClients }: ClientReportProps) {
  const t = useTranslations('reports');

  // Το μέγεθος διαβάζεται με τη ματιά· ο αριθμός μένει για την ακρίβεια.
  const maxRevenue = Math.max(1, ...topClients.map((c) => c.total_revenue));

  const columns: ColumnDef<ClientRevenue>[] = [
    {
      id: 'rank',
      header: '#',
      cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
      meta: { numeric: true, align: 'left', width: 'w-10' },
      enableSorting: false,
    },
    {
      accessorKey: 'client_name',
      header: 'Πελάτης',
      cell: ({ row }) => <span className="font-medium">{row.original.client_name}</span>,
      enableSorting: false,
    },
    {
      id: 'revenueShare',
      header: 'Μερίδιο τζίρου',
      // Η μπάρα είναι `w-full` του κελιού της: χωρίς ρητό πλάτος στη στήλη, ο
      // πίνακας τη στριμώχνει στο ελάχιστο και το γράφημα παύει να διαβάζεται.
      meta: { width: 'w-[30%]' },
      cell: ({ row }) => (
        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${(row.original.total_revenue / maxRevenue) * 100}%`,
              backgroundColor: CHART_PRIMARY,
            }}
          />
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'project_count',
      header: 'Παραγωγές',
      cell: ({ row }) => row.original.project_count,
      meta: { numeric: true },
      enableSorting: false,
    },
    {
      accessorKey: 'total_revenue',
      header: t('revenueTurnover'),
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.total_revenue)}</span>
      ),
      meta: { numeric: true },
      enableSorting: false,
    },
    {
      accessorKey: 'total_collections',
      header: t('collections'),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatCurrency(row.original.total_collections)}
        </span>
      ),
      meta: { numeric: true },
      enableSorting: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('topClients')}</CardTitle>
        <CardDescription>Οι πελάτες με τον μεγαλύτερο τζίρο</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={topClients}
          density="compact"
          emptyState={<span>Δεν υπάρχουν δεδομένα πελατών</span>}
        />
      </CardContent>
    </Card>
  );
}
