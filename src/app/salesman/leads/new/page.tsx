import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { Card, CardContent } from '@/components/ui/card';
import { LeadForm } from '@/components/salesman/leads/lead-form';

export default async function NewLeadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const t = await getTranslations('leads');

  return (
    <div className="space-y-6">
      <PageHeading title={t('addLead')} subtitle={t('description')} />

      <Card>
        <CardContent className="pt-6">
          <LeadForm defaultAssignedTo={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
