import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getLead } from '@/lib/actions/leads';
import { PageHeading } from '@/components/shared/page-heading';
import { Card, CardContent } from '@/components/ui/card';
import { LeadForm } from '@/components/salesman/leads/lead-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
    <div className="space-y-6">
      <PageHeading
        title={t('editLead')}
        subtitle={t('editLeadDetailsFor', { name: lead.contact_name })}
      >
        <Button variant="outline" asChild>
          <Link href={`/salesman/leads/${leadId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToLead')}
          </Link>
        </Button>
      </PageHeading>

      <Card>
        <CardContent className="pt-6">
          <LeadForm lead={lead} defaultAssignedTo={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
