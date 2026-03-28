'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Lightbulb, Pencil, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BookingFormData } from './booking-wizard';

interface StepDetailsProps {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
}

export function StepDetails({ formData, updateFormData }: StepDetailsProps) {
  const t = useTranslations('booking');

  const addReferenceLink = () => {
    updateFormData({
      reference_links: [...formData.reference_links, ''],
    });
  };

  const updateReferenceLink = (index: number, value: string) => {
    const newLinks = [...formData.reference_links];
    newLinks[index] = value;
    updateFormData({ reference_links: newLinks });
  };

  const removeReferenceLink = (index: number) => {
    const newLinks = formData.reference_links.filter((_, i) => i !== index);
    updateFormData({ reference_links: newLinks });
  };

  const descriptionLength = formData.description.length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          <Label htmlFor="title" className="font-medium">
            {t('projectTitleLabel')} *
          </Label>
        </div>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder={t('projectTitlePlaceholder')}
          required
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">{t('projectTitleHelper')}</p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="font-medium">
            {t('projectDescriptionLabel')}
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('charactersUsed', { count: descriptionLength })}
          </span>
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder={t('describeProject')}
          rows={5}
          maxLength={1000}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">{t('projectDescriptionHelper')}</p>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-4">
        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">{t('tipDescribeAudience')}</p>
      </div>

      {/* Reference Links */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <Label className="font-medium">{t('referenceLinksLabel')}</Label>
        </div>
        <p className="text-xs text-muted-foreground">{t('referenceLinksHelper')}</p>

        {/* Existing links as pills */}
        {formData.reference_links.length > 0 && (
          <div className="space-y-2">
            {formData.reference_links.map((link, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={link}
                  onChange={(e) => updateReferenceLink(index, e.target.value)}
                  placeholder="https://example.com/video"
                  type="url"
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-10 w-10 text-muted-foreground hover:text-destructive"
                  onClick={() => removeReferenceLink(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Show filled links as badges */}
        {formData.reference_links.some((l) => l.trim().length > 0) && (
          <div className="flex flex-wrap gap-2">
            {formData.reference_links
              .filter((l) => l.trim().length > 0)
              .map((link, index) => {
                const domain = getDomain(link);
                return (
                  <Badge key={index} variant="secondary" className="gap-1.5 py-1 px-2.5">
                    <Link2 className="h-3 w-3" />
                    <span className="text-xs truncate max-w-[200px]">{domain || link}</span>
                  </Badge>
                );
              })}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addReferenceLink}
          className="w-full gap-2 h-10 border-dashed"
        >
          <Plus className="h-4 w-4" />
          {t('addReferenceLink')}
        </Button>
      </div>
    </div>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}
