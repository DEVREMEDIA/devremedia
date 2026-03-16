'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LeadColumn } from './lead-column';
import { LeadCard } from './lead-card';
import { updateLeadStage } from '@/lib/actions/leads';
import { LEAD_STAGES } from '@/lib/constants';
import type { Lead, LeadStage } from '@/types';

type LeadPipelineProps = {
  leads: Lead[];
};

export function LeadPipeline({ leads }: LeadPipelineProps) {
  const router = useRouter();
  const tToast = useTranslations('toast');
  const [localLeads, setLocalLeads] = useState(leads);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const lead = localLeads.find((l) => l.id === event.active.id);
      setActiveLead(lead ?? null);
    },
    [localLeads],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const draggedLead = activeLead;

      setActiveLead(null);

      if (!over || !draggedLead) return;

      const newStage = over.id as LeadStage;
      if (draggedLead.stage === newStage) return;

      // Optimistic update
      setLocalLeads((prev) =>
        prev.map((l) => (l.id === draggedLead.id ? { ...l, stage: newStage } : l)),
      );

      const result = await updateLeadStage(active.id as string, newStage);

      if (result.error) {
        // Revert on error
        setLocalLeads((prev) =>
          prev.map((l) => (l.id === draggedLead.id ? { ...l, stage: draggedLead.stage } : l)),
        );
        toast.error(tToast('updateError'), { description: result.error });
      } else {
        toast.success(tToast('updateSuccess'));
        router.refresh();
      }
    },
    [activeLead, router, tToast],
  );

  const handleDragCancel = useCallback(() => {
    setActiveLead(null);
  }, []);

  const handleLeadClick = (lead: Lead) => {
    router.push(`/salesman/leads/${lead.id}`);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-7 gap-2">
        {LEAD_STAGES.map((stage) => {
          const stageLeads = localLeads.filter((lead) => lead.stage === stage);
          return (
            <div key={stage} className="min-w-0">
              <LeadColumn stage={stage} leads={stageLeads} onLeadClick={handleLeadClick} />
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} onClick={() => {}} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
