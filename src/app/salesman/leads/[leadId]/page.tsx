import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getLead } from '@/lib/actions/leads';
import { getLeadActivities } from '@/lib/actions/lead-activities';
import { PageHeading } from '@/components/shared/page-heading';
import { LeadDetail } from '@/components/salesman/leads/lead-detail';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function LeadDetailPage({ params }: PageProps) {
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

  return (
    <div className="space-y-6">
      <PageHeading title={lead.contact_name} subtitle={lead.email}>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/salesman/leads">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pipeline
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/salesman/leads/${leadId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Lead
            </Link>
          </Button>
        </div>
      </PageHeading>

      <LeadDetail lead={lead} activities={activities} />
    </div>
  );
}
