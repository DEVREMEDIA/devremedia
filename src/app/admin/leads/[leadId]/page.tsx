import { notFound } from 'next/navigation';
import { AdminLeadDetail, LEAD_TABS } from '@/components/admin/leads/lead-detail';
import { getLead } from '@/lib/actions/leads';
import { getLeadActivities } from '@/lib/actions/lead-activities';
import { createClient } from '@/lib/supabase/server';
import type { ComponentProps } from 'react';

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ tab?: string }>;
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

  // Άγνωστη καρτέλα πέφτει στην πρώτη, όπως ακριβώς κάνουν οι κόμβοι.
  const { tab } = await searchParams;
  const activeTab = LEAD_TABS.includes(tab ?? '') ? (tab as string) : 'info';

  return (
    <AdminLeadDetail
      lead={lead as unknown as ComponentProps<typeof AdminLeadDetail>['lead']}
      activities={activities as unknown as ComponentProps<typeof AdminLeadDetail>['activities']}
      salesmen={(salesmen as unknown as ComponentProps<typeof AdminLeadDetail>['salesmen']) ?? []}
      activeTab={activeTab}
    />
  );
}
