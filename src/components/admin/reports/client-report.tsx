'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('topClients')}</CardTitle>
        <CardDescription>Οι πελάτες με τον μεγαλύτερο τζίρο</CardDescription>
      </CardHeader>
      <CardContent>
        {topClients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν δεδομένα πελατών
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Πελάτης</TableHead>
                <TableHead className="w-[30%]">Μερίδιο τζίρου</TableHead>
                <TableHead className="text-right">Παραγωγές</TableHead>
                <TableHead className="text-right">{t('revenueTurnover')}</TableHead>
                <TableHead className="text-right">{t('collections')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClients.map((client, index) => (
                <TableRow key={client.client_id}>
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{client.client_name}</TableCell>
                  <TableCell>
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(client.total_revenue / maxRevenue) * 100}%`,
                          backgroundColor: CHART_PRIMARY,
                        }}
                      />
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{client.project_count}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(client.total_revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(client.total_collections)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
