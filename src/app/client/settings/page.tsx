import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeading } from '@/components/shared/page-heading';
import { ProfilePanel } from '@/components/client/settings/profile-panel';
import { NotificationPreferences } from '@/components/client/settings/notification-preferences';
import { ChangePassword } from '@/components/client/settings/change-password';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function ClientSettingsPage() {
  const t = await getTranslations('client.settings');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
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
          <ProfilePanel />
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
