'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { isPast } from 'date-fns';
import { Search, ChevronDown, ChevronUp, AlertTriangle, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Invoice {
  id: string;
  invoice_number: string;
  client: { id: string; contact_name: string; company_name?: string | null };
  total: number;
  status: string;
  issue_date: string;
  due_date: string;
}

interface InvoicesContentProps {
  invoices: Invoice[];
}

interface ClientGroup {
  clientId: string;
  clientName: string;
  invoices: Invoice[];
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  overdueCount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);
};

function groupByClient(invoices: Invoice[]): ClientGroup[] {
  const groups = new Map<string, ClientGroup>();

  for (const invoice of invoices) {
    const clientId = invoice.client?.id ?? 'unknown';
    const clientName = invoice.client?.company_name || invoice.client?.contact_name || '—';

    if (!groups.has(clientId)) {
      groups.set(clientId, {
        clientId,
        clientName,
        invoices: [],
        totalInvoiced: 0,
        totalPaid: 0,
        balance: 0,
        overdueCount: 0,
      });
    }

    const group = groups.get(clientId)!;
    group.invoices.push(invoice);
    group.totalInvoiced += invoice.total ?? 0;

    if (invoice.status === 'paid') {
      group.totalPaid += invoice.total ?? 0;
    } else if (invoice.status !== 'cancelled' && invoice.status !== 'draft') {
      group.balance += invoice.total ?? 0;
    }

    const isOverdue =
      invoice.status !== 'paid' &&
      invoice.status !== 'cancelled' &&
      invoice.status !== 'draft' &&
      isPast(new Date(invoice.due_date));
    if (isOverdue) {
      group.overdueCount += 1;
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, 'el'));
}

export function InvoicesContent({ invoices: initialInvoices }: InvoicesContentProps) {
  const t = useTranslations('invoices');
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');
  const [expandedClient, setExpandedClient] = React.useState<string | null>(null);

  const clientGroups = React.useMemo(() => groupByClient(initialInvoices), [initialInvoices]);

  const filteredGroups = React.useMemo(() => {
    let groups = clientGroups;

    if (search) {
      const q = search.toLowerCase();
      groups = groups.filter((g) => g.clientName.toLowerCase().includes(q));
    }

    if (filter === 'withBalance') {
      groups = groups.filter((g) => g.balance > 0);
    } else if (filter === 'withOverdue') {
      groups = groups.filter((g) => g.overdueCount > 0);
    }

    return groups;
  }, [clientGroups, search, filter]);

  const handleToggle = (clientId: string) => {
    setExpandedClient((prev) => (prev === clientId ? null : clientId));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchClient')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allClients')}</SelectItem>
            <SelectItem value="withBalance">{t('withBalance')}</SelectItem>
            <SelectItem value="withOverdue">{t('withOverdue')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {search || filter !== 'all' ? t('noClientsFound') : t('noClientsWithInvoices')}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedClient === group.clientId;
            const invoiceCount = group.invoices.length;

            return (
              <Card key={group.clientId} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleToggle(group.clientId)}
                  className="w-full text-left cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{group.clientName}</h3>
                            {group.overdueCount > 0 && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                {t('overdueCount', { count: group.overdueCount })}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {invoiceCount === 1
                              ? t('invoiceCountOne', { count: invoiceCount })
                              : t('invoiceCount', { count: invoiceCount })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="hidden sm:grid sm:grid-cols-3 gap-4 text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">{t('totalInvoiced')}</p>
                            <p className="text-sm font-medium">
                              {formatCurrency(group.totalInvoiced)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('totalPaid')}</p>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(group.totalPaid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('balance')}</p>
                            <p
                              className={`text-sm font-bold ${group.balance > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}
                            >
                              {formatCurrency(group.balance)}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Mobile stats row */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:hidden">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('totalInvoiced')}</p>
                        <p className="text-sm font-medium">{formatCurrency(group.totalInvoiced)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('totalPaid')}</p>
                        <p className="text-sm font-medium text-green-600">
                          {formatCurrency(group.totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('balance')}</p>
                        <p
                          className={`text-sm font-bold ${group.balance > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}
                        >
                          {formatCurrency(group.balance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="px-4 py-3 font-medium">{t('invoiceNumber')}</th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">
                              {t('issueDate')}
                            </th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">
                              {t('dueDate')}
                            </th>
                            <th className="px-4 py-3 font-medium text-right">{t('lineTotal')}</th>
                            <th className="px-4 py-3 font-medium text-center">
                              {t('paymentStatus')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.invoices.map((invoice) => {
                            const isOverdue =
                              invoice.status !== 'paid' &&
                              invoice.status !== 'cancelled' &&
                              invoice.status !== 'draft' &&
                              isPast(new Date(invoice.due_date));

                            return (
                              <tr
                                key={invoice.id}
                                className="border-b last:border-b-0 hover:bg-accent/30 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <Link
                                    href={`/admin/invoices/${invoice.id}`}
                                    className="font-medium text-primary hover:underline"
                                  >
                                    {invoice.invoice_number}
                                  </Link>
                                  <div className="text-xs text-muted-foreground sm:hidden mt-0.5">
                                    {format(new Date(invoice.issue_date), 'dd/MM/yy')}
                                  </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                  {format(new Date(invoice.issue_date), 'dd/MM/yyyy')}
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                  <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                    {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">
                                  {formatCurrency(invoice.total)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <StatusBadge status={isOverdue ? 'overdue' : invoice.status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
