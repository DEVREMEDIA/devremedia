'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Building2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LEAD_SOURCE_LABELS } from '@/lib/constants';
import type { Lead, LeadSource } from '@/types';

type LeadCardProps = {
  lead: Lead;
  onClick: (lead: Lead) => void;
};

const sourceColors: Record<LeadSource, string> = {
  referral: 'bg-purple-100 text-purple-700 border-purple-300',
  website: 'bg-blue-100 text-blue-700 border-blue-300',
  social_media: 'bg-pink-100 text-pink-700 border-pink-300',
  cold_call: 'bg-slate-100 text-slate-700 border-slate-300',
  event: 'bg-green-100 text-green-700 border-green-300',
  advertisement: 'bg-amber-100 text-amber-700 border-amber-300',
  other: 'bg-gray-100 text-gray-700 border-gray-300',
};

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const daysSinceContact = lead.last_contacted_at
    ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow bg-background',
        isDragging && 'opacity-50',
      )}
      onClick={() => onClick(lead)}
    >
      <div className="flex items-start gap-2">
        <button
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 className="text-sm font-medium leading-tight break-words">{lead.contact_name}</h4>
            {lead.company_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{lead.company_name}</span>
              </div>
            )}
          </div>

          {lead.deal_value !== null && lead.deal_value > 0 && (
            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
              <DollarSign className="h-3.5 w-3.5" />
              <span>€{lead.deal_value.toLocaleString()}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-xs', sourceColors[lead.source])}>
              {LEAD_SOURCE_LABELS[lead.source]}
            </Badge>

            {daysSinceContact !== null && (
              <span
                className={cn(
                  'text-xs',
                  daysSinceContact > 7 ? 'text-red-600 font-medium' : 'text-muted-foreground',
                )}
              >
                {daysSinceContact === 0 ? 'Contacted today' : `${daysSinceContact}d ago`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
