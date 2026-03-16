'use client';

import { ArrowLeft, Download, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { ContractView } from '@/components/shared/contract-view';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteContract, sendContract } from '@/lib/actions/contracts';
import type { Contract } from '@/types';

interface ContractViewPageProps {
  contract: Contract;
}

export function ContractViewPage({ contract }: ContractViewPageProps) {
  const router = useRouter();
  const t = useTranslations('contracts');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteContract(contract.id);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }

    toast.success(t('contractDeletedSuccess'));
    router.push(`/admin/projects/${contract.project_id}`);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/contracts/${contract.id}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${contract.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('pdfDownloaded'));
    } catch {
      toast.error(t('pdfDownloadFailed'));
    }
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendToClient = async () => {
    setIsSending(true);
    try {
      const result = await sendContract(contract.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('contractSentToClient'));
      router.refresh();
    } catch {
      toast.error(t('failedToSendContract'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title={contract.title}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/projects/${contract.project_id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToProject')}
            </Link>
          </Button>
          {contract.status === 'signed' && (
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              {t('downloadPdf')}
            </Button>
          )}
          {contract.status === 'draft' && (
            <Button size="sm" onClick={handleSendToClient} disabled={isSending}>
              <Send className="h-4 w-4 mr-2" />
              {isSending ? t('sending') : t('sendToClient')}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('delete')}
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6">
        <ContractView contract={contract} showSignature />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteContract')}
        description={t('deleteContractConfirm')}
        confirmLabel={t('delete')}
        onConfirm={handleDelete}
        loading={isDeleting}
        destructive
      />
    </div>
  );
}
