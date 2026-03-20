'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProjectForm } from '@/components/admin/projects/project-form';
import { InvoiceUploadForm } from '@/components/admin/invoices/invoice-upload-form';
import type { ClientDrawerMode } from '@/types/relations';
import type { Client } from '@/types/index';

interface ClientDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ClientDrawerMode | null;
  client: Client;
  onSuccess: () => void;
}

const DRAWER_TITLES: Record<ClientDrawerMode['type'], string> = {
  'create-project': 'drawer.createProject',
  'create-invoice': 'drawer.createInvoice',
};

export function ClientDrawer({ open, onOpenChange, mode, client, onSuccess }: ClientDrawerProps) {
  const t = useTranslations('clients');
  const [uploadStep, setUploadStep] = useState<'upload' | 'review'>('upload');

  const handleOpenChange = (open: boolean) => {
    if (!open) setUploadStep('upload');
    onOpenChange(open);
  };

  const handleSuccess = () => {
    handleOpenChange(false);
    onSuccess();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className={`w-full overflow-y-auto ${
          mode?.type === 'create-invoice' && uploadStep === 'review'
            ? 'sm:max-w-5xl'
            : 'sm:max-w-lg'
        }`}
      >
        <SheetHeader>
          <SheetTitle>{mode ? t(DRAWER_TITLES[mode.type]) : ''}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {mode?.type === 'create-project' && (
            <ProjectForm clients={[client]} onSuccess={handleSuccess} />
          )}
          {mode?.type === 'create-invoice' && (
            <InvoiceUploadForm
              clientId={client.id}
              projects={mode.projects}
              nextInvoiceNumber={mode.nextInvoiceNumber}
              onSuccess={handleSuccess}
              onStepChange={setUploadStep}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
