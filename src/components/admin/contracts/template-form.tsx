'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';

const TiptapEditor = dynamic(
  () => import('@/components/shared/tiptap-editor').then((mod) => mod.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[200px] border rounded-lg">
        <LoadingSpinner size="md" />
      </div>
    ),
  },
);
import { createContractTemplate, updateContractTemplate } from '@/lib/actions/contracts';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import type { ContractTemplate } from '@/types';

const templateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  template?: ContractTemplate | null;
  onSuccess: (template: ContractTemplate) => void;
  onCancel: () => void;
}

export function TemplateForm({ template, onSuccess, onCancel }: TemplateFormProps) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState(template?.content || '');
  const [placeholders, setPlaceholders] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: template?.title || '',
      content: template?.content || '',
    },
  });

  // Extract placeholders from content
  useEffect(() => {
    const matches = content.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (matches) {
      const uniquePlaceholders = Array.from(new Set(matches)) as string[];
      setPlaceholders(uniquePlaceholders);
    } else {
      setPlaceholders([]);
    }
  }, [content]);

  const onSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true);

    const formData = {
      title: data.title,
      content,
      placeholders: placeholders.reduce(
        (acc, ph) => {
          acc[ph] = ph.replace(/[{}]/g, '');
          return acc;
        },
        {} as Record<string, string>,
      ),
    };

    try {
      const result = template
        ? await updateContractTemplate(template.id, formData)
        : await createContractTemplate(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(template ? t('templateUpdated') : t('templateCreated'));
      onSuccess(result.data!);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="title">{t('templateName')}</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder={t('templateTitlePlaceholder')}
          disabled={isSubmitting}
        />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label>{t('templateContent')}</Label>
        <div className="border rounded-md">
          <TiptapEditor
            content={content}
            onChange={setContent}
            placeholder={t('templatePlaceholder')}
          />
        </div>
        {errors.content && (
          <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
        )}
      </div>

      {placeholders.length > 0 && (
        <div>
          <Label className="mb-2 block">{t('detectedPlaceholders')}</Label>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((placeholder) => (
              <Badge key={placeholder} variant="secondary">
                {placeholder}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">{t('placeholdersAutoFillNotice')}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {tc('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
          {template ? t('updateTemplate') : t('createTemplateCta')}
        </Button>
      </div>
    </form>
  );
}
