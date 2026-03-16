'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <UserCheck className="mr-2 h-4 w-4" />
          {t('convertToClient')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('convertToClient')}</DialogTitle>
          <DialogDescription>{t('convertDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('convertToClient')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
