import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getLead } from '@/lib/actions/leads';
import { DetailShell } from '@/components/shared/detail-shell';
import { Card, CardContent } from '@/components/ui/card';
import { LeadForm } from '@/components/salesman/leads/lead-form';

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function EditLeadPage({ params }: PageProps) {
  const t = await getTranslations('leads');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { leadId } = await params;

  const result = await getLead(leadId);

  if (result.error || !result.data) {
    notFound();
  }

  const lead = result.data as import('@/types').Lead;

  return (
    <DetailShell
      backHref={`/salesman/leads/${leadId}`}
      backLabel={lead.contact_name}
      title={t('editLead')}
      meta={t('editLeadDetailsFor', { name: lead.contact_name })}
    >
      <Card>
        <CardContent className="pt-6">
          <LeadForm lead={lead} defaultAssignedTo={user.id} />
        </CardContent>
      </Card>
    </DetailShell>
  );
}
