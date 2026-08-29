import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/client/settings/profile-form';
import { getMyProfile } from '@/lib/actions/profile';
import { requireUser } from '@/lib/auth-helpers';

/**
 * Η καρτέλα «Προφίλ», ίδια για πελάτη, εργαζόμενο και πωλητή.
 *
 * Τρεις σελίδες Ρυθμίσεων έδειχναν το ίδιο πράγμα με τρία αντίγραφα του ίδιου
 * fetch. Το τι είναι το Προφίλ το αποφασίζει το `getMyProfile` — η σελίδα
 * απλώς του δίνει θέση.
 */
export async function ProfilePanel() {
  const t = await getTranslations('client.settings');
  const [{ user }, result] = await Promise.all([requireUser(), getMyProfile()]);

  if (result.error !== null || user === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('profileTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('profileLoadError')}</p>
        </CardContent>
      </Card>
    );
  }

  return <ProfileForm userId={user.id} profile={result.data} />;
}
