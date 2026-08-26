import { Suspense, type ComponentProps } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
import { CostHealthCard } from '@/components/admin/dashboard/finance/cost-health-card';
import { ProjectProfitabilityCard } from '@/components/admin/dashboard/finance/project-profitability-card';
import { CardSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';

import { getInvoices } from '@/lib/actions/invoices';
import { getExpenses } from '@/lib/actions/expenses';
import { getProjects } from '@/lib/actions/projects';
import { getPricingHealth } from '@/lib/actions/pricing-health';
import { getAdminRole } from '@/lib/auth-helpers';
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminFinance');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string; from?: string; to?: string }>;

async function InvoicesTab() {
  const t = await getTranslations('shellV2.pages.adminFinance');
  const result = await getInvoices();

  if (result.error) {
    return <p className="text-sm text-destructive">{t('error', { message: result.error })}</p>;
  }

  return (
    <InvoicesContent
      invoices={(result.data as ComponentProps<typeof InvoicesContent>['invoices']) ?? []}
    />
  );
}

async function ExpensesTab() {
  const t = await getTranslations('shellV2.pages.adminFinance');
  const [expensesResult, projectsResult] = await Promise.all([getExpenses(), getProjects()]);

  if (expensesResult.error) {
    return (
      <p className="text-sm text-destructive">{t('error', { message: expensesResult.error })}</p>
    );
  }

  return (
    <ExpensesContent expenses={expensesResult.data ?? []} projects={projectsResult.data ?? []} />
  );
}

async function ReportsTab({ dateRange }: { dateRange?: DateRange }) {
  const t = await getTranslations('shellV2.pages.adminFinance');
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
        <h2 className="mb-4 text-lg font-semibold">{t('sectionRevenue')}</h2>
        <RevenueReport monthlyData={monthlyRevenue} paymentMethodData={paymentMethodData} />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t('sectionProjects')}</h2>
        <ProjectReport
          projectsByStatus={projectsByStatus}
          projectsByType={projectsByType}
          averageDuration={averageDuration}
        />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t('sectionClients')}</h2>
        <ClientReport topClients={topClients} />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">{t('sectionExpenses')}</h2>
        <ExpenseReport expensesByCategory={expensesByCategory} profitData={profitData} />
      </section>
    </div>
  );
}

async function CostModelTab() {
  const [categories, items, settings, summary, breakdowns, role] = await Promise.all([
    getCostCategories(),
    getCostItems({ include_inactive: true }),
    getCostSettings(),
    getCostSummary(),
    getCostItemBreakdowns({ include_inactive: true }),
    getAdminRole(),
  ]);

  return (
    <div className="space-y-6">
      {role === 'super_admin' && (
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <CostHealthCard />
        </Suspense>
      )}
      <CostModelContent
        initialCategories={categories.data ?? []}
        initialItems={items.data ?? []}
        initialSettings={settings.data}
        initialSummary={summary.data}
        initialBreakdowns={breakdowns.data ?? []}
      />
    </div>
  );
}

async function PricingHealthTab() {
  const [healthRes, settingsRes, role] = await Promise.all([
    getPricingHealth(),
    getCostSettings(),
    getAdminRole(),
  ]);
  const settings = settingsRes.data;

  return (
    <div className="space-y-6">
      {role === 'super_admin' && (
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <ProjectProfitabilityCard />
        </Suspense>
      )}
      <PricingHealthContent
        summary={healthRes.data}
        error={healthRes.error}
        minMultiplier={Number(settings?.price_min_multiplier ?? 1.3)}
        targetMultiplier={Number(settings?.price_target_multiplier ?? 1.6)}
        maxMultiplier={Number(settings?.price_max_multiplier ?? 2.0)}
      />
    </div>
  );
}

export default async function FinancePage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.adminFinance');
  const TABS: SectionTab[] = [
    { key: 'invoices', label: t('tabInvoices') },
    { key: 'expenses', label: t('tabExpenses') },
    { key: 'reports', label: t('tabReports') },
    { key: 'cost', label: t('tabCost') },
    { key: 'health', label: t('tabHealth') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'invoices';
  const dateRange: DateRange | undefined =
    params.from && params.to ? { from: params.from, to: params.to } : undefined;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
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
