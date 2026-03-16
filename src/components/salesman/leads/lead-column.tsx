'use client';

import { useDroppable } from '@dnd-kit/core';
import { LeadCard } from './lead-card';
import { LEAD_STAGE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Lead, LeadStage } from '@/types';

type LeadColumnProps = {
  stage: LeadStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
};

const stageColors: Record<LeadStage, string> = {
  new: 'bg-slate-50 border-slate-200',
  contacted: 'bg-blue-50 border-blue-200',
  qualified: 'bg-indigo-50 border-indigo-200',
  proposal: 'bg-purple-50 border-purple-200',
  negotiation: 'bg-amber-50 border-amber-200',
  won: 'bg-green-50 border-green-200',
  lost: 'bg-red-50 border-red-200',
};

export function LeadColumn({ stage, leads, onLeadClick }: LeadColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.deal_value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border-2 border-dashed p-3 min-h-[500px] transition-colors',
        stageColors[stage],
        isOver && 'ring-2 ring-primary ring-offset-2',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground truncate">
            {LEAD_STAGE_LABELS[stage]}
          </h3>
          {totalValue > 0 && (
            <p className="text-xs text-muted-foreground mt-1">€{totalValue.toLocaleString()}</p>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 space-y-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
        ))}
      </div>
    </div>
  );
}
