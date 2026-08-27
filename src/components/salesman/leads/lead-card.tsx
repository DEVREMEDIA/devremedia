'use client';

import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Building2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LEAD_SOURCE_LABELS } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import type { Lead } from '@/types';

type LeadCardProps = {
  lead: Lead;
  onClick: (lead: Lead) => void;
  isOverlay?: boolean;
};

export function LeadCard({ lead, onClick, isOverlay }: LeadCardProps) {
  const t = useTranslations('leads');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });

  const daysSinceContact = lead.last_contacted_at
    ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const cardContent = (
    <Card className="p-2.5 hover:shadow-md transition-shadow bg-background">
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <h4 className="text-xs font-medium leading-tight break-words line-clamp-2">
              {lead.contact_name}
            </h4>
            {lead.company_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{lead.company_name}</span>
              </div>
            )}
          </div>

          {lead.deal_value !== null && lead.deal_value > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-tone-positive">
              <DollarSign className="h-3 w-3" />
              <span>€{lead.deal_value.toLocaleString()}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {LEAD_SOURCE_LABELS[lead.source]}
            </Badge>

            {daysSinceContact !== null && (
              <span
                className={cn(
                  'text-xs',
                  daysSinceContact > 7 ? 'text-tone-critical font-medium' : 'text-muted-foreground',
                )}
              >
                {daysSinceContact === 0
                  ? t('contactedToday')
                  : t('daysAgo', { count: daysSinceContact })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (isOverlay) {
    return <div className="rotate-3 opacity-80 w-48">{cardContent}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick(lead)}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-opacity duration-150',
        isDragging ? 'opacity-30' : 'opacity-100',
      )}
    >
      {cardContent}
    </div>
  );
}
