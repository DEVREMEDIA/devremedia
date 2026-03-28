import { createClient } from '@/lib/supabase/server';
import { getProjects } from '@/lib/actions/projects';
import { getInvoices } from '@/lib/actions/invoices';
import { getDeliverablesByProject } from '@/lib/actions/deliverables';
import { getMyContracts } from '@/lib/actions/contracts';
import { redirect } from 'next/navigation';
import { ActiveProjects } from '@/components/client/dashboard/active-projects';
import { PendingActions } from '@/components/client/dashboard/pending-actions';
import { RecentDeliverables } from '@/components/client/dashboard/recent-deliverables';
import { UpcomingFilmings } from '@/components/client/dashboard/upcoming-filmings';
import { DashboardStats } from '@/components/client/dashboard/dashboard-stats';
import { getTranslations } from 'next-intl/server';
import type { DeliverableWithProject } from '@/types';

export default async function ClientDashboardPage() {
  const t = await getTranslations('client.dashboard');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get client record for this user
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const clientId = clientRecord?.id;

  // Fetch client's data — filtered by client_id
  const projectsResult = await getProjects({ client_id: clientId });
  const projects = projectsResult.data ?? [];

  const invoicesResult = await getInvoices({
    status: ['sent', 'viewed', 'overdue', 'paid', 'cancelled'],
    ...(clientId && { client_id: clientId }),
  });
  const invoices = (invoicesResult.data ?? []) as import('@/types').InvoiceWithRelations[];

  // Get recent deliverables from all projects
  const deliverableResults = await Promise.all(
    projects.slice(0, 5).map(async (project) => {
      const result = await getDeliverablesByProject(project.id);
      return (result.data ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        version: d.version,
        created_at: d.created_at,
        project_id: d.project_id,
        project: { title: project.title },
      }));
    }),
  );
  const allDeliverables: DeliverableWithProject[] = deliverableResults.flat();

  const recentDeliverables = allDeliverables
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Fetch client contracts
  const contractsResult = await getMyContracts();
  const contracts = contractsResult.data ?? [];

  // Contracts awaiting signature
  const unsignedContracts = contracts.filter((c) => c.status === 'sent' || c.status === 'viewed');

  // Active projects (not archived or delivered)
  const activeProjects = projects.filter(
    (p) => p.status !== 'archived' && p.status !== 'delivered',
  );

  // Pending invoices (not paid)
  const pendingInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      {/* Stat Cards */}
      <DashboardStats
        activeProjectsCount={activeProjects.length}
        pendingActionsCount={pendingInvoices.length + unsignedContracts.length}
        upcomingFilmingsCount={
          activeProjects.filter(
            (p) =>
              (p as { filming_date?: string }).filming_date &&
              new Date((p as { filming_date?: string }).filming_date!) >= new Date(),
          ).length
        }
      />

      {/* Active Projects with timeline */}
      <ActiveProjects projects={activeProjects} />

      {/* Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Actions */}
        <PendingActions invoices={pendingInvoices} unsignedContracts={unsignedContracts} />

        {/* Recent Deliverables */}
        <RecentDeliverables deliverables={recentDeliverables} />
      </div>

      {/* Upcoming Filmings */}
      <UpcomingFilmings projects={activeProjects} />
    </div>
  );
}
