'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EquipmentChecklist } from '@/components/admin/filming-prep/equipment-checklist';
import { ShotList } from '@/components/admin/filming-prep/shot-list';
import { ConceptNotes } from '@/components/admin/filming-prep/concept-notes';
import { assignProject } from '@/lib/actions/projects';
import { ClipboardList, Camera, FileText, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile } from '@/types';

interface FilmingPrepContentProps {
  projectId: string;
  projectTitle: string;
  assignedTo?: string | null;
  teamMembers?: UserProfile[];
}

export function FilmingPrepContent({
  projectId,
  projectTitle,
  assignedTo,
  teamMembers = [],
}: FilmingPrepContentProps) {
  const t = useTranslations('filmingPrep');
  const [activeTab, setActiveTab] = useState('equipment');
  const [currentAssignee, setCurrentAssignee] = useState(assignedTo ?? '');

  const handleAssign = async (userId: string) => {
    const value = userId === 'unassigned' ? null : userId;
    setCurrentAssignee(userId === 'unassigned' ? '' : userId);
    const result = await assignProject(projectId, value);
    if (result.error) {
      toast.error(result.error);
      setCurrentAssignee(assignedTo ?? '');
    } else {
      toast.success(t('assignedSuccessfully'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('filmingPreparation')}
        description={t('manageFor', { project: projectTitle })}
      />

      {teamMembers.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <UserCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{t('assignTo')}</span>
          <Select value={currentAssignee || 'unassigned'} onValueChange={handleAssign}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t('selectTeamMember')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.display_name || member.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>{t('equipment')}</span>
          </TabsTrigger>
          <TabsTrigger value="shots" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span>{t('shotList')}</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{t('conceptNotes')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-6">
          <EquipmentChecklist projectId={projectId} />
        </TabsContent>

        <TabsContent value="shots" className="space-y-6">
          <ShotList projectId={projectId} />
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <ConceptNotes projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
