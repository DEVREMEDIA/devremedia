'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InvoiceUploadForm } from '@/components/admin/invoices/invoice-upload-form';

interface CreateInvoiceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  projects: { id: string; title: string; client_id: string }[];
  nextInvoiceNumber: string;
  onSuccess: () => void;
}

export function CreateInvoiceDrawer({
  open,
  onOpenChange,
  clientId,
  projects,
  nextInvoiceNumber,
  onSuccess,
}: CreateInvoiceDrawerProps) {
  const t = useTranslations('invoices');
  const [uploadStep, setUploadStep] = useState<'upload' | 'review'>('upload');

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setUploadStep('upload');
    onOpenChange(isOpen);
  };

  const handleSuccess = () => {
    handleOpenChange(false);
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className={`w-full overflow-y-auto ${
          uploadStep === 'review' ? 'sm:max-w-5xl' : 'sm:max-w-lg'
        }`}
      >
        <SheetHeader>
          <SheetTitle>{t('createInvoice')}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <InvoiceUploadForm
            clientId={clientId}
            projects={projects}
            nextInvoiceNumber={nextInvoiceNumber}
            onSuccess={handleSuccess}
            onStepChange={setUploadStep}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
