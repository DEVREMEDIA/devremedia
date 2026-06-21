'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  createDuration,
  removeDuration,
  setSlotInterval,
  setCapacity,
  setWeekdayHours,
  type BookingConfig,
  type Duration,
  type WeekdayHours,
} from '@/lib/actions/booking-config';

const formatDuration = (minutes: number): string =>
  minutes % 60 === 0 ? `${minutes / 60}ω` : `${minutes}΄`;

const WEEKDAY_LABELS = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

type BookingSettingsProps = {
  config: BookingConfig;
  weeklyTemplate: WeekdayHours[];
};

export function BookingSettings({ config, weeklyTemplate }: BookingSettingsProps) {
  const router = useRouter();
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  const [durations, setDurations] = useState<Duration[]>(config.durations);
  const [newMinutes, setNewMinutes] = useState('');
  const [capacityValue, setCapacityValue] = useState(String(config.capacity));
  const [intervalValue, setIntervalValue] = useState(String(config.interval));
  const [template, setTemplate] = useState<WeekdayHours[]>(weeklyTemplate);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleAddDuration = async () => {
    const mins = parseInt(newMinutes, 10);
    if (!mins || mins < 1) return;
    setBusy(true);
    const result = await createDuration({ minutes: mins });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? tc('error'));
      return;
    }
    setDurations((prev) => [...prev, result.data!]);
    setNewMinutes('');
    toast.success(tc('success'));
    refresh();
  };

  const handleRemoveDuration = async (id: string) => {
    setRemovingId(id);
    const result = await removeDuration(id);
    setRemovingId(null);
    setConfirmRemoveId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setDurations((prev) => prev.filter((d) => d.id !== id));
    toast.success(tc('success'));
    refresh();
  };

  const handleCapacity = async () => {
    setBusy(true);
    const result = await setCapacity({ capacity: parseInt(capacityValue, 10) });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? tc('error'));
      return;
    }
    setCapacityValue(String(result.data.capacity));
    toast.success(tc('success'));
    refresh();
  };

  const handleInterval = async () => {
    setBusy(true);
    const result = await setSlotInterval({ interval: parseInt(intervalValue, 10) });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? tc('error'));
      return;
    }
    setIntervalValue(String(result.data.interval));
    toast.success(tc('success'));
    refresh();
  };

  const handleWeekdayToggle = async (weekday: number, is_open: boolean) => {
    const row = template.find((r) => r.weekday === weekday);
    const result = await setWeekdayHours({
      weekday,
      is_open,
      open_time: row?.open_time ?? '09:00',
      close_time: row?.close_time ?? '17:00',
    });
    if (result.error || !result.data) {
      toast.error(result.error ?? tc('error'));
      return;
    }
    setTemplate((prev) => prev.map((r) => (r.weekday === weekday ? result.data! : r)));
    refresh();
  };

  const handleWeekdayTimeChange = (
    weekday: number,
    field: 'open_time' | 'close_time',
    value: string,
  ) => {
    const row = template.find((r) => r.weekday === weekday);
    if (!row) return;
    const updated = { ...row, [field]: value };
    setTemplate((prev) => prev.map((r) => (r.weekday === weekday ? updated : r)));
  };

  const handleWeekdayTimeBlur = async (weekday: number) => {
    const row = template.find((r) => r.weekday === weekday);
    if (!row) return;
    const result = await setWeekdayHours({
      weekday,
      is_open: row.is_open,
      open_time: row.open_time,
      close_time: row.close_time,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Durations card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('bookingDurations')}</CardTitle>
          <CardDescription>{t('bookingConfigDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {durations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noTimeSlots')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {durations.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-1 rounded-md border bg-muted px-3 py-1 text-sm"
                >
                  <span>{formatDuration(d.minutes)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={removingId === d.id}
                    onClick={() => setConfirmRemoveId(d.id)}
                    aria-label={tc('delete')}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              className="w-32"
              placeholder="min"
              value={newMinutes}
              onChange={(e) => setNewMinutes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDuration();
                }
              }}
            />
            <Button onClick={handleAddDuration} disabled={busy || !newMinutes.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              {t('addDuration')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Start interval card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('startInterval')}</CardTitle>
          <CardDescription>{t('intervalMinutes')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="booking-interval">{t('intervalMinutes')}</Label>
              <Input
                id="booking-interval"
                type="number"
                min={5}
                step={5}
                className="w-32"
                value={intervalValue}
                onChange={(e) => setIntervalValue(e.target.value)}
              />
            </div>
            <Button onClick={handleInterval} disabled={busy}>
              {busy ? tc('saving') : t('saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Capacity card */}
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
                value={capacityValue}
                onChange={(e) => setCapacityValue(e.target.value)}
              />
            </div>
            <Button onClick={handleCapacity} disabled={busy}>
              {busy ? tc('saving') : t('saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly template card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('weeklyTemplate')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => i).map((weekday) => {
              const row = template.find((r) => r.weekday === weekday) ?? {
                weekday,
                is_open: false,
                open_time: null,
                close_time: null,
              };
              return (
                <div key={weekday} className="flex flex-wrap items-center gap-3">
                  <span className="w-10 text-sm font-medium">{WEEKDAY_LABELS[weekday]}</span>
                  <Switch
                    checked={row.is_open}
                    onCheckedChange={(checked) => handleWeekdayToggle(weekday, checked)}
                    aria-label={row.is_open ? t('open') : t('closed')}
                  />
                  <span className="w-14 text-sm text-muted-foreground">
                    {row.is_open ? t('open') : t('closed')}
                  </span>
                  {row.is_open && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{t('from')}</span>
                        <Input
                          type="time"
                          className="w-28"
                          value={row.open_time ?? '09:00'}
                          onChange={(e) =>
                            handleWeekdayTimeChange(weekday, 'open_time', e.target.value)
                          }
                          onBlur={() => handleWeekdayTimeBlur(weekday)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{t('to')}</span>
                        <Input
                          type="time"
                          className="w-28"
                          value={row.close_time ?? '17:00'}
                          onChange={(e) =>
                            handleWeekdayTimeChange(weekday, 'close_time', e.target.value)
                          }
                          onBlur={() => handleWeekdayTimeBlur(weekday)}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Remove duration confirm dialog */}
      <ConfirmDialog
        open={confirmRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveId(null);
        }}
        title={tc('delete')}
        description={tc('confirm')}
        confirmLabel={tc('delete')}
        destructive
        loading={removingId !== null}
        onConfirm={() => {
          if (confirmRemoveId) handleRemoveDuration(confirmRemoveId);
        }}
      />
    </div>
  );
}
