'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EquipmentChecklist } from '@/components/admin/filming-prep/equipment-checklist';
import { ShotList } from '@/components/admin/filming-prep/shot-list';
import { ConceptNotes } from '@/components/admin/filming-prep/concept-notes';
import { ClipboardList, Camera, FileText } from 'lucide-react';

interface FilmingPrepContentProps {
  projectId: string;
  projectTitle: string;
}

export function FilmingPrepContent({ projectId, projectTitle }: FilmingPrepContentProps) {
  const t = useTranslations('filmingPrep');
  const [activeTab, setActiveTab] = useState('equipment');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('filmingPreparation')}
        description={t('manageFor', { project: projectTitle })}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
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

        <TabsContent value="equipment" className="space-y-4">
          <EquipmentChecklist projectId={projectId} />
        </TabsContent>

        <TabsContent value="shots" className="space-y-4">
          <ShotList projectId={projectId} />
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <ConceptNotes projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
