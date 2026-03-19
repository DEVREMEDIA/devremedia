'use client';

import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ReadReceiptIndicatorProps {
  isRead: boolean;
  className?: string;
}

export function ReadReceiptIndicator({ isRead, className }: ReadReceiptIndicatorProps) {
  const t = useTranslations('messages');
  if (isRead) {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <CheckCheck className="h-3 w-3" />
        <span>{t('readReceipt')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Check className="h-3 w-3" />
      <span>{t('sent')}</span>
    </div>
  );
}
