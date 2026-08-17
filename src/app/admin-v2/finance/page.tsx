import type { ComponentProps } from 'react';
import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

// Τα υπάρχοντα κομμάτια μπαίνουν αυτούσια — μετακομίζουν, δεν ξαναγράφονται.
import { InvoicesContent } from '@/app/admin/invoices/invoices-content';
import { ExpensesContent } from '@/app/admin/invoices/expenses/expenses-content';
import { CostModelContent } from '@/app/admin/cost-model/cost-model-content';
import { PricingHealthContent } from '@/app/admin/pricing-health/pricing-health-content';
import { DateRangeFilter } from '@/components/admin/reports/date-range-filter';
import { RevenueReport } from '@/components/admin/reports/revenue-report';
import { ProjectReport } from '@/components/admin/reports/project-report';
import { ClientReport } from '@/components/admin/reports/client-report';
import { ExpenseReport } from '@/components/admin/reports/expense-report';

import { getInvoices } from '@/lib/actions/invoices';
import { getExpenses } from '@/lib/actions/expenses';
import { getProjects } from '@/lib/actions/projects';
import { getPricingHealth } from '@/lib/actions/pricing-health';
import {
  getCostCategories,
  getCostItems,
  getCostSettings,
  getCostSummary,
} from '@/lib/actions/cost-model';
import { getCostItemBreakdowns } from '@/lib/actions/cost-item-breakdown';
import {
  getMonthlyRevenue,
  getPaymentMethodBreakdown,
  getProjectTypeBreakdown,
  getTopClientsByRevenue,
  getExpensesByCategory,
  getProfitMargin,
  getAverageProjectDuration,
  type DateRange,
} from '@/lib/queries/reports';
import { getProjectsByStatus } from '@/lib/queries';

export const metadata: Metadata = { title: 'Οικονομικά' };

const TABS: SectionTab[] = [
  { key: 'invoices', label: 'Τιμολόγια' },
  { key: 'expenses', label: 'Έξοδα' },
  { key: 'reports', label: 'Αναφορές' },
  { key: 'cost', label: 'Κοστολόγηση' },
  { key: 'health', label: 'Υγεία τιμολόγησης' },
];

type SearchParams = Promise<{ tab?: string; from?: string; to?: string }>;

async function InvoicesTab() {
  const result = await getInvoices();

  if (result.error) {
    return <p className="text-sm text-destructive">Σφάλμα: {result.error}</p>;
  }

  return (
    <InvoicesContent
      invoices={(result.data as ComponentProps<typeof InvoicesContent>['invoices']) ?? []}
    />
  );
}

async function ExpensesTab() {
  const [expensesResult, projectsResult] = await Promise.all([getExpenses(), getProjects()]);

  if (expensesResult.error) {
    return <p className="text-sm text-destructive">Σφάλμα: {expensesResult.error}</p>;
  }

  return (
    <ExpensesContent expenses={expensesResult.data ?? []} projects={projectsResult.data ?? []} />
  );
}

async function ReportsTab({ dateRange }: { dateRange?: DateRange }) {
  const [
    monthlyRevenue,
    paymentMethodData,
    projectsByStatus,
    projectsByType,
    topClients,
    expensesByCategory,
    profitData,
    averageDuration,
  ] = await Promise.all([
    getMonthlyRevenue(dateRange),
    getPaymentMethodBreakdown(dateRange),
    getProjectsByStatus(),
    getProjectTypeBreakdown(dateRange),
    getTopClientsByRevenue(10, dateRange),
    getExpensesByCategory(dateRange),
    getProfitMargin(dateRange),
    getAverageProjectDuration(),
  ]);

  return (
    <div className="space-y-6">
      <DateRangeFilter />
      <section>
        <h2 className="mb-4 text-lg font-semibold">Έσοδα</h2>
        <RevenueReport monthlyData={monthlyRevenue} paymentMethodData={paymentMethodData} />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Παραγωγές</h2>
        <ProjectReport
          projectsByStatus={projectsByStatus}
          projectsByType={projectsByType}
          averageDuration={averageDuration}
        />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Πελάτες</h2>
        <ClientReport topClients={topClients} />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Έξοδα & περιθώριο</h2>
        <ExpenseReport expensesByCategory={expensesByCategory} profitData={profitData} />
      </section>
    </div>
  );
}

async function CostModelTab() {
  const [categories, items, settings, summary, breakdowns] = await Promise.all([
    getCostCategories(),
    getCostItems({ include_inactive: true }),
    getCostSettings(),
    getCostSummary(),
    getCostItemBreakdowns({ include_inactive: true }),
  ]);

  return (
    <CostModelContent
      initialCategories={categories.data ?? []}
      initialItems={items.data ?? []}
      initialSettings={settings.data}
      initialSummary={summary.data}
      initialBreakdowns={breakdowns.data ?? []}
    />
  );
}

async function PricingHealthTab() {
  const [healthRes, settingsRes] = await Promise.all([getPricingHealth(), getCostSettings()]);
  const settings = settingsRes.data;

  return (
    <PricingHealthContent
      summary={healthRes.data}
      error={healthRes.error}
      minMultiplier={Number(settings?.price_min_multiplier ?? 1.3)}
      targetMultiplier={Number(settings?.price_target_multiplier ?? 1.6)}
      maxMultiplier={Number(settings?.price_max_multiplier ?? 2.0)}
    />
  );
}

export default async function FinancePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'invoices';
  const dateRange: DateRange | undefined =
    params.from && params.to ? { from: params.from, to: params.to } : undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Οικονομικά</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Τιμολόγια, έξοδα, αναφορές, κοστολόγηση και υγεία τιμολόγησης — ένα μέρος
        </p>
      </header>

      <SectionTabs basePath="/admin-v2/finance" tabs={TABS} active={active} />

      {active === 'invoices' && <InvoicesTab />}
      {active === 'expenses' && <ExpensesTab />}
      {active === 'reports' && <ReportsTab dateRange={dateRange} />}
      {active === 'cost' && <CostModelTab />}
      {active === 'health' && <PricingHealthTab />}
    </div>
  );
}
