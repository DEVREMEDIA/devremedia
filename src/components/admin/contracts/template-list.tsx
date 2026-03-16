'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { FileText, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { deleteContractTemplate } from '@/lib/actions/contracts';
import { toast } from 'sonner';
import type { ContractTemplate } from '@/types';

interface TemplateListProps {
  templates: ContractTemplate[];
  onEdit: (template: ContractTemplate) => void;
  onDelete: (id: string) => void;
}

export function TemplateList({ templates, onEdit, onDelete }: TemplateListProps) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteContractTemplate(deleteId);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }

    toast.success(t('templateDeletedSuccess'));
    onDelete(deleteId);
    setDeleteId(null);
    setIsDeleting(false);
  };

  const extractPlaceholders = (content: string): number => {
    const matches = content.match(/\{([a-zA-Z0-9_]+)\}/g);
    return matches ? new Set(matches).size : 0;
  };

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('noTemplates')}
        description={t('noTemplatesDescription')}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {template.content.slice(0, 100) || 'No description'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Placeholders</span>
                  <Badge variant="secondary">
                    {extractPlaceholders(template.content)} variables
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {format(new Date(template.created_at), 'MMM d, yyyy')}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onEdit(template)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('deleteTemplate')}
        description={t('deleteTemplateConfirm')}
        confirmLabel={tc('delete')}
        onConfirm={handleDelete}
        loading={isDeleting}
        destructive
      />
    </>
  );
}
