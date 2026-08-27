'use client';

import { useDroppable } from '@dnd-kit/core';
import { ProjectWithClient } from '@/types';
import type { UserProfile } from '@/types/index';
import { ProjectStatus, PROJECT_STATUS_LABELS } from '@/lib/constants';
import { statusTone, type Tone } from '@/lib/status-tone';
import { ProjectCard } from './project-card';

interface ProjectColumnProps {
  status: ProjectStatus;
  projects: ProjectWithClient[];
  isOver?: boolean;
  isDragging?: boolean;
  teamMembers?: UserProfile[];
}

// Tailwind δεν βλέπει δυναμικά χτισμένα class names, οπότε ο χάρτης μένει
// στατικός — αλλά τώρα έχει 4 γραμμές (τόνος) αντί για 8 (κατάσταση) x 3.
const TONE_DOT: Record<Tone, string> = {
  critical: 'bg-tone-critical',
  caution: 'bg-tone-caution',
  positive: 'bg-tone-positive',
  neutral: 'bg-tone-neutral',
};

const TONE_HIGHLIGHT: Record<Tone, string> = {
  critical: 'ring-tone-critical bg-tone-critical-bg',
  caution: 'ring-tone-caution bg-tone-caution-bg',
  positive: 'ring-tone-positive bg-tone-positive-bg',
  neutral: 'ring-tone-neutral bg-tone-neutral-bg',
};

export function ProjectColumn({
  status,
  projects,
  isOver,
  isDragging,
  teamMembers,
}: ProjectColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });
  const tone = statusTone(status);

  return (
    <div className="flex-shrink-0 w-[220px] xl:w-auto xl:min-w-0" ref={setNodeRef}>
      <div
        className={`
          rounded-lg border h-full transition-all duration-200
          ${isOver ? `ring-2 ${TONE_HIGHLIGHT[tone]}` : 'bg-muted/30'}
          ${isDragging && !isOver ? 'opacity-60' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 px-2 py-2 border-b">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TONE_DOT[tone]}`} />
          <h3 className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground truncate flex-1">
            {PROJECT_STATUS_LABELS[status]}
          </h3>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 flex-shrink-0">
            {projects.length}
          </span>
        </div>

        {/* Cards */}
        <div className="p-1.5 space-y-1.5 min-h-[80px] max-h-[calc(100vh-240px)] overflow-y-auto">
          {projects.length === 0 && (
            <div
              className={`
                flex items-center justify-center h-[60px] rounded text-[10px] transition-all duration-200
                ${
                  isOver
                    ? 'border-2 border-dashed border-muted-foreground/30 text-muted-foreground'
                    : 'text-muted-foreground/40'
                }
              `}
            >
              {isOver ? '⬇' : '-'}
            </div>
          )}
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} teamMembers={teamMembers} />
          ))}
        </div>
      </div>
    </div>
  );
}
