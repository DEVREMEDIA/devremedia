import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestNewLinkForm } from '@/components/auth/request-new-link-form';

/**
 * Friendly screen shown when an invitation/confirmation link is expired or invalid,
 * with a self-service control to get a fresh link emailed.
 */
export default async function LinkExpiredPage() {
  const t = await getTranslations('auth');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('linkExpiredTitle')}</CardTitle>
        <CardDescription>{t('linkExpiredDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <RequestNewLinkForm />
      </CardContent>
    </Card>
  );
}
