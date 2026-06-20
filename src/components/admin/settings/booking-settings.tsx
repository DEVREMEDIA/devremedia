'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createTimeSlot,
  removeTimeSlot,
  renameTimeSlot,
  reorderTimeSlots,
  setCapacity,
  type BookingConfig,
  type TimeSlot,
} from '@/lib/actions/booking-config';

type BookingSettingsProps = {
  config: BookingConfig;
};

export function BookingSettings({ config }: BookingSettingsProps) {
  const router = useRouter();
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const tToast = useTranslations('toast');

  const [slots, setSlots] = useState<TimeSlot[]>(config.time_slots);
  const [newName, setNewName] = useState('');
  const [capacity, setCapacityValue] = useState(String(config.capacity));
  const [busy, setBusy] = useState(false);

  const refresh = () => router.refresh();

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const result = await createTimeSlot({ name: newName });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? tToast('createError'));
      return;
    }
    const created = result.data;
    setSlots((prev) => [...prev, created]);
    setNewName('');
    toast.success(tToast('createSuccess'));
    refresh();
  };

  const handleRename = async (id: string, name: string) => {
    setBusy(true);
    const result = await renameTimeSlot(id, { name });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? tToast('saveError'));
      return;
    }
    const updated = result.data;
    setSlots((prev) => prev.map((s) => (s.id === id ? updated : s)));
    toast.success(tToast('saveSuccess'));
    refresh();
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    const result = await removeTimeSlot(id);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== id));
    toast.success(tToast('deleteSuccess'));
    refresh();
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    const previous = slots;
    const reordered = [...slots];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSlots(reordered);
    setBusy(true);
    const result = await reorderTimeSlots({ ordered_ids: reordered.map((s) => s.id) });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? tToast('saveError'));
      setSlots(previous); // revert optimistic move
      return;
    }
    setSlots(result.data);
    refresh();
  };

  const handleCapacity = async () => {
    setBusy(true);
    const result = await setCapacity({ capacity });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? tToast('saveError'));
      return;
    }
    setCapacityValue(String(result.data.capacity));
    toast.success(tToast('saveSuccess'));
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('timeSlots')}</CardTitle>
          <CardDescription>{t('timeSlotsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noTimeSlots')}</p>
          ) : (
            <ul className="space-y-2">
              {slots.map((slot, index) => (
                <TimeSlotRow
                  key={slot.id}
                  slot={slot}
                  index={index}
                  total={slots.length}
                  busy={busy}
                  onRename={handleRename}
                  onRemove={handleRemove}
                  onMove={handleMove}
                  labels={{
                    moveUp: t('moveUp'),
                    moveDown: t('moveDown'),
                    remove: tc('remove'),
                    save: tc('save'),
                  }}
                />
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('newTimeSlotPlaceholder')}
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button onClick={handleAdd} disabled={busy || !newName.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              {t('addTimeSlot')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('capacity')}</CardTitle>
          <CardDescription>{t('capacityDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="booking-capacity">{t('capacity')}</Label>
              <Input
                id="booking-capacity"
                type="number"
                min={1}
                step={1}
                className="w-32"
                value={capacity}
                onChange={(e) => setCapacityValue(e.target.value)}
              />
            </div>
            <Button onClick={handleCapacity} disabled={busy}>
              {busy ? tc('saving') : t('saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type TimeSlotRowProps = {
  slot: TimeSlot;
  index: number;
  total: number;
  busy: boolean;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  labels: { moveUp: string; moveDown: string; remove: string; save: string };
};

function TimeSlotRow({
  slot,
  index,
  total,
  busy,
  onRename,
  onRemove,
  onMove,
  labels,
}: TimeSlotRowProps) {
  const [name, setName] = useState(slot.name);
  const changed = name.trim() !== slot.name && name.trim().length > 0;

  return (
    <li className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={busy || !changed}
        onClick={() => onRename(slot.id, name)}
        aria-label={labels.save}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={busy || index === 0}
        onClick={() => onMove(index, -1)}
        aria-label={labels.moveUp}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={busy || index === total - 1}
        onClick={() => onMove(index, 1)}
        aria-label={labels.moveDown}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={() => onRemove(slot.id)}
        aria-label={labels.remove}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}
