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

type ClientReportProps = {
  topClients: ClientRevenue[];
};

export function ClientReport({ topClients }: ClientReportProps) {
  const t = useTranslations('reports');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('topClients')}</CardTitle>
        <CardDescription>Clients generating the most revenue</CardDescription>
      </CardHeader>
      <CardContent>
        {topClients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No client data available</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">{t('totalRevenue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClients.map((client, index) => (
                <TableRow key={client.client_id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{client.client_name}</TableCell>
                  <TableCell className="text-right">{client.project_count}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(client.total_revenue)}
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
