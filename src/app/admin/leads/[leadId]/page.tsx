import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { AdminLeadDetail } from '@/components/admin/leads/lead-detail';
import { getLead } from '@/lib/actions/leads';
import { getLeadActivities } from '@/lib/actions/lead-activities';
import { createClient } from '@/lib/supabase/server';
import type { ComponentProps } from 'react';

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  const [leadResult, activitiesResult] = await Promise.all([
    getLead(leadId),
    getLeadActivities(leadId),
  ]);

  if (leadResult.error || !leadResult.data) {
    notFound();
  }

  const lead = leadResult.data as import('@/types').Lead;
  const activities = (activitiesResult.data ?? []) as import('@/types').LeadActivity[];

  // Fetch salesmen for reassignment dropdown
  const supabase = await createClient();
  const { data: salesmen } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('role', ['salesman', 'admin', 'super_admin'])
    .order('display_name', { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader title={lead.contact_name} description={lead.company_name ?? lead.email} />
      <AdminLeadDetail
        lead={lead as unknown as ComponentProps<typeof AdminLeadDetail>['lead']}
        activities={activities as unknown as ComponentProps<typeof AdminLeadDetail>['activities']}
        salesmen={(salesmen as unknown as ComponentProps<typeof AdminLeadDetail>['salesmen']) ?? []}
      />
    </div>
  );
}
