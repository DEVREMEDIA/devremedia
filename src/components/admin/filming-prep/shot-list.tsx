'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import { getShotLists, createShotList, updateShotList } from '@/lib/actions/filming-prep';
import type { Shot, ShotList as ShotListData } from '@/types';
import { SHOT_TYPES, SHOT_TYPE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/shared/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Plus, Trash2, Camera, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ShotListProps {
  projectId: string;
}

export function ShotList({ projectId }: ShotListProps) {
  const t = useTranslations('filmingPrep');
  const [shotLists, setShotLists] = useState<ShotListData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShotListId, setActiveShotListId] = useState<string | null>(null);

  const loadShotLists = useCallback(async () => {
    setLoading(true);
    const result = await getShotLists(projectId);
    if (result.error) {
      toast.error(t('failedToLoadShotLists'));
      setLoading(false);
      return;
    }

    setShotLists(result.data ?? []);
    if (result.data && result.data.length > 0) {
      setActiveShotListId(result.data[0].id);
    }
    setLoading(false);
  }, [projectId, t]);

  useEffect(() => {
    void loadShotLists();
  }, [loadShotLists]);

  const handleCreateShotList = async () => {
    setLoading(true);
    const result = await createShotList(projectId);
    setLoading(false);

    if (result.error) {
      toast.error(t('failedToCreateShotList'));
      return;
    }

    toast.success(t('shotListCreated'));
    await loadShotLists();
    setActiveShotListId(result.data!.id);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (shotLists.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Camera}
            title={t('noShotList')}
            description={t('createFirstShotList')}
            action={{ label: t('createShotList'), onClick: handleCreateShotList }}
          />
        </CardContent>
      </Card>
    );
  }

  const activeShotList = shotLists.find((list) => list.id === activeShotListId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('shotList')}</CardTitle>
        <CardDescription>{t('planAndTrackShots')}</CardDescription>
      </CardHeader>
      <CardContent>{activeShotList && <ShotListTable shotList={activeShotList} />}</CardContent>
    </Card>
  );
}

interface ShotListTableProps {
  shotList: ShotListData;
}

function ShotListTable({ shotList }: ShotListTableProps) {
  const t = useTranslations('filmingPrep');
  const tc = useTranslations('common');
  const [shots, setShots] = useState<Shot[]>(shotList.shots || []);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateShotList(shotList.id, { shots });
    setSaving(false);

    if (result.error) {
      toast.error(t('failedToSaveShotList'));
    } else {
      setIsDirty(false);
      toast.success(t('shotListSaved'));
    }
  };

  const addShot = () => {
    const newShot: Shot = {
      number: shots.length + 1,
      description: '',
      shot_type: 'medium',
      location: '',
      duration_est: '',
      notes: '',
      completed: false,
    };
    setShots((prev) => [...prev, newShot]);
    setIsDirty(true);
  };

  // Οι στήλες πιο κάτω μπαίνουν σε useMemo, οπότε κάθε handler που καλεί ένα
  // κελί χρειάζεται σταθερή ταυτότητα — αλλιώς οι μνημονευμένες στήλες
  // κλειδώνουν πάνω σε ένα παλιό closure. Και οι τρεις χρησιμοποιούν μόνο τη
  // συναρτησιακή μορφή του setShots, άρα δεν εξαρτώνται πραγματικά από τίποτα.
  const updateShot = useCallback((index: number, updates: Partial<Shot>) => {
    setShots((prev) => prev.map((shot, i) => (i === index ? { ...shot, ...updates } : shot)));
    setIsDirty(true);
  }, []);

  const deleteShot = useCallback((index: number) => {
    setShots((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((shot, i) => ({ ...shot, number: i + 1 }));
    });
    setIsDirty(true);
  }, []);

  const toggleCompleted = useCallback((index: number) => {
    setShots((prev) =>
      prev.map((shot, i) => (i === index ? { ...shot, completed: !shot.completed } : shot)),
    );
    setIsDirty(true);
  }, []);

  const columns: ColumnDef<Shot>[] = useMemo(
    () => [
      {
        accessorKey: 'number',
        header: '#',
        meta: { align: 'center', width: 'w-12' },
        cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
      },
      {
        accessorKey: 'description',
        header: tc('description'),
        meta: { width: 'w-[200px]' },
        cell: ({ row }) => (
          <Input
            value={row.original.description}
            onChange={(e) => updateShot(row.index, { description: e.target.value })}
            placeholder={t('shotDescriptionPlaceholder')}
            className="h-9"
          />
        ),
      },
      {
        accessorKey: 'shot_type',
        header: t('shotType'),
        meta: { width: 'w-[140px]' },
        cell: ({ row }) => (
          <Select
            value={row.original.shot_type}
            onValueChange={(value) =>
              updateShot(row.index, { shot_type: value as Shot['shot_type'] })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHOT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {SHOT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'location',
        header: t('locationPlaceholder'),
        meta: { width: 'w-[160px]' },
        cell: ({ row }) => (
          <Input
            value={row.original.location || ''}
            onChange={(e) => updateShot(row.index, { location: e.target.value })}
            placeholder={t('locationPlaceholder')}
            className="h-9"
          />
        ),
      },
      {
        accessorKey: 'duration_est',
        header: t('durationEstimate'),
        meta: { width: 'w-[120px]' },
        cell: ({ row }) => (
          <Input
            value={row.original.duration_est || ''}
            onChange={(e) => updateShot(row.index, { duration_est: e.target.value })}
            placeholder={t('durationPlaceholder')}
            className="h-9"
          />
        ),
      },
      {
        accessorKey: 'notes',
        header: tc('notes'),
        meta: { width: 'w-[160px]' },
        cell: ({ row }) => (
          <Input
            value={row.original.notes || ''}
            onChange={(e) => updateShot(row.index, { notes: e.target.value })}
            placeholder={t('shotNotesPlaceholder')}
            className="h-9"
          />
        ),
      },
      {
        accessorKey: 'completed',
        header: t('doneLabel'),
        meta: { align: 'center', width: 'w-[80px]' },
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.completed}
            onCheckedChange={() => toggleCompleted(row.index)}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        meta: { width: 'w-[60px]' },
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => deleteShot(row.index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [t, tc, updateShot, toggleCompleted, deleteShot],
  );

  const completedCount = shots.filter((shot) => shot.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {shots.length > 0 && (
            <span className="font-medium">
              {t('shotsCompleted', { completed: completedCount, total: shots.length })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <LoadingSpinner size="sm" />
              {tc('saving')}
            </span>
          )}
          {isDirty && (
            <Button onClick={handleSave} size="sm" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? tc('saving') : tc('save')}
            </Button>
          )}
          <Button onClick={addShot} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {t('addShot')}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={shots}
        emptyState={
          <EmptyState icon={Camera} title={t('noShotsYet')} description={t('addFirstShot')} />
        }
      />
    </div>
  );
}
