'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCompanySettings } from '@/lib/actions/settings';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { CompanySettings } from '@/lib/actions/settings';

type BrandingSettingsProps = {
  settings: CompanySettings;
};

// Δεδομένο, όχι σχεδιαστικό χρώμα: η αρχική τιμή του color picker όταν ο
// πελάτης δεν έχει ορίσει ακόμα δικό του brand χρώμα. Ο χρήστης το αλλάζει
// ελεύθερα — δεν υπάρχει token να το αντικαταστήσει, γιατί δεν είναι UI.
const NO_BRAND_COLOR_SET = '#000000';

export function BrandingSettings({ settings }: BrandingSettingsProps) {
  const router = useRouter();
  const tToast = useTranslations('toast');
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || NO_BRAND_COLOR_SET);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateCompanySettings({
      ...settings,
      primary_color: primaryColor,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(tToast('saveSuccess'));
      router.refresh();
    }

    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branding')}</CardTitle>
        <CardDescription>{t('brandingDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary_color">{t('primaryColor')}</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="primary_color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder={NO_BRAND_COLOR_SET}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('primaryColorDescription')}</p>
          </div>

          <div className="space-y-2">
            <Label>{t('logoUploadLabel')}</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">{t('logoUploadSoon')}</p>
              <p className="text-xs text-muted-foreground mt-2">{t('logoUploadNote')}</p>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tc('saving') : t('saveChanges')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
