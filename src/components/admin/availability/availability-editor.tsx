'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  getMonthAvailability,
  applyTemplateToMonth,
  setDayAvailability,
  type DayRow,
} from '@/lib/actions/booking-config';

interface AvailabilityEditorProps {
  initialMonth: string;
}

const WEEKDAY_SHORT = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

function daysInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' }).slice(0, 7);
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'UTC' }).slice(0, 7);
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00`).getDay();
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
}

export function AvailabilityEditor({ initialMonth }: AvailabilityEditorProps) {
  const t = useTranslations('availability');
  const tc = useTranslations('common');

  const [month, setMonth] = useState(initialMonth);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const loadMonth = useCallback(async (m: string) => {
    setLoading(true);
    const result = await getMonthAvailability(m);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setRows(result.data ?? []);
  }, []);

  useEffect(() => {
    loadMonth(month);
  }, [month, loadMonth]);

  const getRow = (date: string): DayRow | undefined => rows.find((r) => r.date === date);

  const handleToggle = async (date: string, isOpen: boolean) => {
    const existing = getRow(date);
    const openTime = existing?.open_time || '09:00';
    const closeTime = existing?.close_time || '17:00';

    const result = await setDayAvailability({
      date,
      is_open: isOpen,
      open_time: openTime,
      close_time: closeTime,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }
    setRows((prev) => {
      const updated = result.data!;
      const idx = prev.findIndex((r) => r.date === date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleTimeBlur = async (date: string, field: 'open_time' | 'close_time', value: string) => {
    const existing = getRow(date);
    const openTime = field === 'open_time' ? value : existing?.open_time || '09:00';
    const closeTime = field === 'close_time' ? value : existing?.close_time || '17:00';
    const isOpen = existing?.is_open ?? true;

    const sentinelOpen = openTime || '09:00';
    const sentinelClose = closeTime || '17:00';

    const result = await setDayAvailability({
      date,
      is_open: isOpen,
      open_time: sentinelOpen,
      close_time: sentinelClose,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }
    setRows((prev) => {
      const updated = result.data!;
      const idx = prev.findIndex((r) => r.date === date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleApplyTemplate = async () => {
    setApplyingTemplate(true);
    const result = await applyTemplateToMonth(month);
    setApplyingTemplate(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t('templateApplied', { count: result.data?.written ?? 0 }));
    loadMonth(month);
  };

  const days = daysInMonth(month);

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(prevMonth(month))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-40 text-center capitalize">
            {formatMonthLabel(month)}
          </span>
          <Button variant="outline" size="icon" onClick={() => setMonth(nextMonth(month))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyTemplate}
          disabled={applyingTemplate}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${applyingTemplate ? 'animate-spin' : ''}`} />
          {t('applyTemplate')}
        </Button>
      </div>

      {/* Day rows */}
      <div className="rounded-md border divide-y">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{tc('loading')}</div>
        ) : (
          days.map((date) => {
            const row = getRow(date);
            const isOpen = row?.is_open ?? false;
            const openTime = row?.open_time ?? '09:00';
            const closeTime = row?.close_time ?? '17:00';
            const weekday = weekdayOf(date);
            const dayNum = date.slice(-2);

            return (
              <div key={date} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                {/* Date label */}
                <div className="flex items-center gap-2 w-24 flex-shrink-0">
                  <span className="text-xs text-muted-foreground w-8">
                    {WEEKDAY_SHORT[weekday]}
                  </span>
                  <span className="text-sm font-medium">{dayNum}</span>
                </div>

                {/* Open/closed toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    id={`open-${date}`}
                    checked={isOpen}
                    onCheckedChange={(checked) => handleToggle(date, checked)}
                  />
                  <Label
                    htmlFor={`open-${date}`}
                    className={`text-xs w-16 ${isOpen ? 'text-tone-positive' : 'text-muted-foreground'}`}
                  >
                    {isOpen ? t('open') : t('closed')}
                  </Label>
                </div>

                {/* Time inputs */}
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={openTime}
                    disabled={!isOpen}
                    className="w-32 text-sm h-8"
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.date === date ? { ...r, open_time: e.target.value } : r,
                        ),
                      )
                    }
                    onBlur={(e) => isOpen && handleTimeBlur(date, 'open_time', e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={closeTime}
                    disabled={!isOpen}
                    className="w-32 text-sm h-8"
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.date === date ? { ...r, close_time: e.target.value } : r,
                        ),
                      )
                    }
                    onBlur={(e) => isOpen && handleTimeBlur(date, 'close_time', e.target.value)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
