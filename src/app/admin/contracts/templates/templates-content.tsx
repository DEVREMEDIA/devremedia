'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { TemplateList } from '@/components/admin/contracts/template-list';
import { TemplateForm } from '@/components/admin/contracts/template-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ContractTemplate } from '@/types';

interface TemplatesContentProps {
  templates: ContractTemplate[];
}

export function TemplatesContent({ templates: initialTemplates }: TemplatesContentProps) {
  const t = useTranslations('contracts');
  const [templates, setTemplates] = useState(initialTemplates);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleSuccess = (template: ContractTemplate) => {
    if (editingTemplate) {
      setTemplates(templates.map((tmpl) => (tmpl.id === template.id ? template : tmpl)));
    } else {
      setTemplates([template, ...templates]);
    }
    setIsFormOpen(false);
    setEditingTemplate(null);
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((tmpl) => tmpl.id !== id));
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addTemplate')}
        </Button>
      </div>

      <div className="mt-6">
        <TemplateList templates={templates} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? t('editTemplate') : t('addTemplate')}</DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSuccess={handleSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
