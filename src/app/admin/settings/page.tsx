import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamManagement } from '@/components/admin/settings/team-management';
import { CompanyProfile } from '@/components/admin/settings/company-profile';
import { BrandingSettings } from '@/components/admin/settings/branding-settings';
import { StripeConfig } from '@/components/admin/settings/stripe-config';
import { NotificationSettingsComponent } from '@/components/admin/settings/notification-settings';
import { getTeamMembers } from '@/lib/actions/team';
import { getCompanySettings, getNotificationSettings } from '@/lib/actions/settings';
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
  const t = await getTranslations('settings');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [teamMembersResult, companySettingsResult, notificationSettingsResult] = await Promise.all([
    getTeamMembers(),
    getCompanySettings(),
    user ? getNotificationSettings(user.id) : null,
  ]);

  const teamMembers = teamMembersResult.data ?? [];
  const companySettings = companySettingsResult.data ?? {
    company_name: 'ΝΤΕΒΡΕΝΤΛΗΣ ΑΓΓΕΛΟΣ ΝΙΚΟΛΑΟΣ',
    logo_url: null,
    address: 'ΣΟΦΟΥΛΗ ΘΕΜΙΣΤΟΚΛΗ 88, ΚΑΛΑΜΑΡΙΑ',
    phone: null,
    email: null,
    vat_number: '160594763',
    tax_office: 'ΚΑΛΑΜΑΡΙΑΣ',
    profession: 'ΥΠΗΡΕΣΙΕΣ ΦΩΤΟΓΡΑΦΙΣΗΣ ΚΑΙ ΒΙΝΤΕΟΣΚΟΠΗΣΗΣ',
    primary_color: null,
  };
  const notificationSettings = notificationSettingsResult?.data ?? {
    email_new_project: true,
    email_project_deadline: true,
    email_invoice_paid: true,
    email_new_message: true,
    email_deliverable_feedback: true,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <Tabs defaultValue="company" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="company">{t('company')}</TabsTrigger>
            <TabsTrigger value="team">{t('team')}</TabsTrigger>
            <TabsTrigger value="branding">{t('branding')}</TabsTrigger>
            <TabsTrigger value="integrations">{t('integrations')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('notificationPreferences')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="company" className="space-y-6">
          <CompanyProfile settings={companySettings} />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <TeamManagement members={teamMembers} />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <BrandingSettings settings={companySettings} />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <StripeConfig />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {user && (
            <NotificationSettingsComponent userId={user.id} settings={notificationSettings} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
