import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth-helpers';
import {
  getClientProjects,
  getClientInvoices,
  getClientContracts,
  getClientAgreement,
  getClientRecentDeliverables,
} from '@/lib/queries/client-portal';
import { MyAgreementCard } from '@/components/client/dashboard/my-agreement-card';
import { ActiveProjects } from '@/components/client/dashboard/active-projects';
import { PendingActions } from '@/components/client/dashboard/pending-actions';
import { RecentDeliverables } from '@/components/client/dashboard/recent-deliverables';
import { UpcomingFilmings } from '@/components/client/dashboard/upcoming-filmings';
import { DashboardStats } from '@/components/client/dashboard/dashboard-stats';
import { InvoicesSummary } from '@/components/client/dashboard/invoices-summary';
import { CompletedProjects } from '@/components/client/dashboard/completed-projects';
import { PageHeading } from '@/components/shared/page-heading';
import { CardSkeleton, KpiStripSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';

async function StatsSection() {
  const [projects, invoices, contracts] = await Promise.all([
    getClientProjects(),
    getClientInvoices(),
    getClientContracts(),
  ]);
  const activeProjects = projects.filter(
    (p) => p.status !== 'archived' && p.status !== 'delivered',
  );
  const pendingInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
  const unsignedContracts = contracts.filter((c) => c.status === 'sent' || c.status === 'viewed');

  return (
    <DashboardStats
      activeProjectsCount={activeProjects.length}
      pendingActionsCount={pendingInvoices.length + unsignedContracts.length}
      upcomingFilmingsCount={
        activeProjects.filter((p) => p.filming_date && new Date(p.filming_date) >= new Date())
          .length
      }
    />
  );
}

async function AgreementSection() {
  const agreement = await getClientAgreement();
  return <MyAgreementCard agreement={agreement} />;
}

async function ActiveProjectsSection() {
  const projects = await getClientProjects();
  const activeProjects = projects.filter(
    (p) => p.status !== 'archived' && p.status !== 'delivered',
  );
  return <ActiveProjects projects={activeProjects} />;
}

async function PendingActionsSection() {
  const [invoices, contracts] = await Promise.all([getClientInvoices(), getClientContracts()]);
  const pendingInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
  const unsignedContracts = contracts.filter((c) => c.status === 'sent' || c.status === 'viewed');
  return <PendingActions invoices={pendingInvoices} unsignedContracts={unsignedContracts} />;
}

async function RecentDeliverablesSection() {
  const deliverables = await getClientRecentDeliverables();
  return <RecentDeliverables deliverables={deliverables} />;
}

async function InvoicesSummarySection() {
  const invoices = await getClientInvoices();
  return <InvoicesSummary invoices={invoices} />;
}

async function UpcomingFilmingsSection() {
  const projects = await getClientProjects();
  const activeProjects = projects.filter(
    (p) => p.status !== 'archived' && p.status !== 'delivered',
  );
  return <UpcomingFilmings projects={activeProjects} />;
}

async function CompletedProjectsSection() {
  const projects = await getClientProjects();
  const completedProjects = projects.filter(
    (p) => p.status === 'delivered' || p.status === 'archived',
  );
  return <CompletedProjects projects={completedProjects} />;
}

export default async function ClientDashboardPage() {
  const t = await getTranslations('client.dashboard');

  // Ο έλεγχος ταυτότητας μένει στην κρίσιμη διαδρομή: μια σελίδα πελάτη δεν
  // αρχίζει να ζωγραφίζει πριν ξέρουμε ότι υπάρχει πελάτης.
  const { user } = await requireUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-8">
      <PageHeading title={t('title')} subtitle={t('description')} />

      <Suspense fallback={<KpiStripSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={3} />}>
        <AgreementSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={4} />}>
        <ActiveProjectsSection />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={4} />}>
          <PendingActionsSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton rows={4} />}>
          <RecentDeliverablesSection />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton rows={4} />}>
        <InvoicesSummarySection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={3} />}>
        <UpcomingFilmingsSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={3} />}>
        <CompletedProjectsSection />
      </Suspense>
    </div>
  );
}
