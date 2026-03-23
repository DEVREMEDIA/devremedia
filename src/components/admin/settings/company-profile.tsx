'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateCompanySettings } from '@/lib/actions/settings';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { CompanySettings } from '@/lib/actions/settings';

type CompanyProfileProps = {
  settings: CompanySettings;
};

export function CompanyProfile({ settings }: CompanyProfileProps) {
  const router = useRouter();
  const tToast = useTranslations('toast');
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateCompanySettings(formData);

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
        <CardTitle>{t('companyProfile')}</CardTitle>
        <CardDescription>{t('companyProfileDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">{t('companyName')}</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('companyEmail')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('companyPhone')}</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('companyAddress')}</Label>
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat_number">{t('vatNumber')}</Label>
            <Input
              id="vat_number"
              value={formData.vat_number || ''}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_office">{t('companyTaxOffice')}</Label>
            <Input
              id="tax_office"
              value={formData.tax_office || ''}
              onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profession">{t('companyProfession')}</Label>
            <Input
              id="profession"
              value={formData.profession || ''}
              onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">{t('logoUrl')}</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url || ''}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tc('saving') : t('saveChanges')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
