'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/shared/form-dialog';
import { convertLeadToClient } from '@/lib/actions/leads';
import type { Lead } from '@/types';

type LeadConvertDialogProps = {
  lead: Lead;
};

export function LeadConvertDialog({ lead }: LeadConvertDialogProps) {
  const router = useRouter();
  const t = useTranslations('leads');
  const tCommon = useTranslations('common');
  const tToast = useTranslations('toast');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConvert = async () => {
    setIsLoading(true);

    try {
      const result = await convertLeadToClient(lead.id);

      if (result.error) {
        toast.error(tToast('updateError'), {
          description: result.error,
        });
      } else {
        toast.success(tToast('updateSuccess'));
        setIsOpen(false);
        router.push('/salesman/leads');
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="default" onClick={() => setIsOpen(true)}>
        <UserCheck className="mr-2 h-4 w-4" />
        {t('convertToClient')}
      </Button>

      <FormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={t('convertToClient')}
        description={t('convertDescription')}
        onSubmit={handleConvert}
        submitLabel={t('convertToClient')}
        cancelLabel={tCommon('cancel')}
        submitting={isLoading}
      >
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">{t('contactName')}:</span>{' '}
            <span className="font-medium">{lead.contact_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('email')}:</span>{' '}
            <span className="font-medium">{lead.email}</span>
          </div>
          {lead.phone && (
            <div>
              <span className="text-muted-foreground">{t('phone')}:</span>{' '}
              <span className="font-medium">{lead.phone}</span>
            </div>
          )}
          {lead.company_name && (
            <div>
              <span className="text-muted-foreground">{t('companyName')}:</span>{' '}
              <span className="font-medium">{lead.company_name}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{t('confirmConvert')}</p>
      </FormDialog>
    </>
  );
}
