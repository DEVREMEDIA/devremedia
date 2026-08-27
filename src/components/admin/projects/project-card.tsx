'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ProjectWithClient } from '@/types';
import type { UserProfile } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Building2, Calendar, User, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { assignProject } from '@/lib/actions/projects';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { statusTone, type Tone } from '@/lib/status-tone';

interface ProjectCardProps {
  project: ProjectWithClient;
  isOverlay?: boolean;
  teamMembers?: UserProfile[];
}

// Tailwind δεν βλέπει δυναμικά χτισμένα class names, οπότε ο χάρτης μένει
// στατικός — αλλά τώρα έχει 4 γραμμές (τόνος) αντί για 4 x 2 (προτεραιότητα).
const TONE_BORDER: Record<Tone, string> = {
  critical: 'border-l-tone-critical',
  caution: 'border-l-tone-caution',
  positive: 'border-l-tone-positive',
  neutral: 'border-l-tone-neutral',
};

const TONE_DOT: Record<Tone, string> = {
  critical: 'bg-tone-critical',
  caution: 'bg-tone-caution',
  positive: 'bg-tone-positive',
  neutral: 'bg-tone-neutral',
};

export function ProjectCard({ project, isOverlay, teamMembers }: ProjectCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
  });
  const priorityBorder = TONE_BORDER[statusTone(project.priority)];

  const handleClick = () => {
    if (!isDragging) {
      router.push(`/admin/projects/${project.id}`);
    }
  };

  if (isOverlay) {
    return (
      <Card
        className={`p-2.5 shadow-2xl border-l-[3px] w-[200px] bg-background rotate-[2deg] ${priorityBorder}`}
      >
        <CardInner project={project} teamMembers={teamMembers} />
      </Card>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`transition-opacity duration-150 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : 'opacity-100'}`}
    >
      <Card
        className={`
          border-l-[3px] p-2.5
          ${priorityBorder}
          hover:shadow-md transition-shadow duration-200
        `}
      >
        <CardInner project={project} teamMembers={teamMembers} />
      </Card>
    </div>
  );
}

function CardInner({
  project,
  teamMembers,
}: {
  project: ProjectWithClient;
  teamMembers?: UserProfile[];
}) {
  const t = useTranslations('projects');
  const tPriority = useTranslations('statuses.priority');
  const [open, setOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState(project.assigned_to);
  const assignee = teamMembers?.find((m) => m.id === assignedTo);

  const handleAssign = async (userId: string | null) => {
    const previousValue = assignedTo;
    setAssignedTo(userId);
    setOpen(false);

    const result = await assignProject(project.id, userId);
    if (result.error) {
      setAssignedTo(previousValue);
      toast.error(result.error);
    } else {
      toast.success(t('assignSuccess'));
    }
  };

  return (
    <>
      <h4 className="font-medium text-xs leading-snug line-clamp-2 mb-1">{project.title}</h4>

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
        <Building2 className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">
          {project.client?.company_name || project.client?.contact_name}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[statusTone(project.priority)]}`} />
          <span className="text-[10px] text-muted-foreground">{tPriority(project.priority)}</span>
        </div>

        <div className="flex items-center gap-1">
          {project.deadline && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(project.deadline), 'MMM d')}
            </span>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((prev) => !prev);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="cursor-pointer"
                title={assignee ? (assignee.display_name ?? t('assignedTo')) : t('unassigned')}
              >
                {assignee ? (
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                    {(assignee.display_name ?? '?')[0].toUpperCase()}
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[220px] p-0"
              align="end"
              side="bottom"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Command>
                <CommandInput placeholder={t('assignEmployee')} className="text-xs" />
                <CommandList>
                  <CommandEmpty>{t('unassigned')}</CommandEmpty>
                  <CommandGroup>
                    {assignedTo && (
                      <CommandItem
                        value="__remove__"
                        onSelect={() => handleAssign(null)}
                        className="text-xs text-destructive"
                      >
                        {t('removeAssignment')}
                      </CommandItem>
                    )}
                    {teamMembers
                      ?.filter((m) => m.role === 'employee')
                      .map((member) => (
                        <CommandItem
                          key={member.id}
                          value={member.display_name ?? member.id}
                          onSelect={() => handleAssign(member.id === assignedTo ? null : member.id)}
                          className="text-xs"
                        >
                          <Check
                            className={cn(
                              'mr-1 h-3 w-3',
                              assignedTo === member.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span className="truncate">
                            {member.display_name ?? member.id.slice(0, 8)}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
}
