import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { ProfileForm } from '@/components/client/settings/profile-form';
import { NotificationPreferences } from '@/components/client/settings/notification-preferences';
import { ChangePassword } from '@/components/client/settings/change-password';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, Lock } from 'lucide-react';

export default async function SalesmanSettingsPage() {
  const t = await getTranslations('client.settings');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 space-y-6">
      <PageHeading title={t('title')} subtitle={t('description')} />

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              {t('profileTab')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              {t('notificationsTab')}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              {t('securityTab')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <ProfileForm user={user} profile={profile} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="security">
          <ChangePassword />
        </TabsContent>
      </Tabs>
    </div>
  );
}
