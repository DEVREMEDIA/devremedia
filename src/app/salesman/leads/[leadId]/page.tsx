import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getLead } from '@/lib/actions/leads';
import { getLeadActivities } from '@/lib/actions/lead-activities';
import { LeadDetail, LEAD_TABS } from '@/components/salesman/leads/lead-detail';

type PageProps = {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function LeadDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { leadId } = await params;

  const [leadResult, activitiesResult] = await Promise.all([
    getLead(leadId),
    getLeadActivities(leadId),
  ]);

  if (leadResult.error || !leadResult.data) {
    notFound();
  }

  const lead = leadResult.data as import('@/types').Lead & {
    assigned_user?: { display_name: string; avatar_url: string | null };
  };
  const activities = (activitiesResult.data ?? []) as import('@/types').LeadActivity[];

  // Άγνωστη καρτέλα πέφτει στην πρώτη, όπως ακριβώς κάνουν οι κόμβοι.
  const { tab } = await searchParams;
  const activeTab = LEAD_TABS.includes(tab ?? '') ? (tab as string) : 'info';

  return <LeadDetail lead={lead} activities={activities} activeTab={activeTab} />;
}
