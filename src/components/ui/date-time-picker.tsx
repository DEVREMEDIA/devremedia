'use client';

import * as React from 'react';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, parse } from 'date-fns';
import { el as elLocale, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DateTimePickerProps = {
  value: string | undefined | null;
  onChange: (value: string) => void;
  mode: 'date' | 'datetime';
  placeholder?: string;
  /** Minute granularity for the time dropdown. Default 15. */
  minuteStep?: number;
  disabled?: boolean;
};

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function parseDateValue(value: string | undefined | null, mode: 'date' | 'datetime'): Date | null {
  if (!value) return null;
  try {
    if (mode === 'date') {
      // Expected YYYY-MM-DD
      return parse(value, 'yyyy-MM-dd', new Date());
    }
    // datetime-local format: YYYY-MM-DDTHH:mm
    if (value.includes('T')) {
      const [datePart, timePart] = value.split('T');
      const [y, m, d] = datePart.split('-').map(Number);
      const [hh, mm] = timePart.split(':').map(Number);
      return new Date(y, m - 1, d, hh || 0, mm || 0);
    }
    return parse(value, 'yyyy-MM-dd', new Date());
  } catch {
    return null;
  }
}

function formatDateValue(date: Date, mode: 'date' | 'datetime'): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  if (mode === 'date') return `${y}-${m}-${d}`;
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function DateTimePicker({
  value,
  onChange,
  mode,
  placeholder,
  minuteStep = 15,
  disabled,
}: DateTimePickerProps) {
  const locale = useLocale();
  const dateFnsLocale = locale === 'el' ? elLocale : enUS;
  const parsed = parseDateValue(value, mode);

  const hours = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = React.useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < 60; m += minuteStep) out.push(m);
    return out;
  }, [minuteStep]);

  const currentHour = parsed ? parsed.getHours() : 9;
  const currentMinute = parsed ? Math.round(parsed.getMinutes() / minuteStep) * minuteStep : 0;

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    if (mode === 'date') {
      onChange(formatDateValue(date, 'date'));
      return;
    }
    // Preserve existing time if already set, otherwise default to 09:00
    const next = new Date(date);
    next.setHours(currentHour, currentMinute, 0, 0);
    onChange(formatDateValue(next, 'datetime'));
  };

  const handleHourChange = (hourStr: string) => {
    const base = parsed ?? new Date();
    base.setHours(Number(hourStr), currentMinute, 0, 0);
    onChange(formatDateValue(base, 'datetime'));
  };

  const handleMinuteChange = (minStr: string) => {
    const base = parsed ?? new Date();
    base.setHours(currentHour, Number(minStr), 0, 0);
    onChange(formatDateValue(base, 'datetime'));
  };

  const displayLabel = parsed
    ? mode === 'date'
      ? format(parsed, 'PPP', { locale: dateFnsLocale })
      : format(parsed, 'PPP', { locale: dateFnsLocale })
    : placeholder || '—';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn('flex-1 justify-start font-normal', !parsed && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsed ?? undefined}
            onSelect={handleDateSelect}
            locale={dateFnsLocale}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {mode === 'datetime' && (
        <div className="flex items-center gap-1">
          <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
          <Select value={pad2(currentHour)} onValueChange={handleHourChange} disabled={disabled}>
            <SelectTrigger className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[240px]">
              {hours.map((h) => (
                <SelectItem key={h} value={pad2(h)}>
                  {pad2(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select
            value={pad2(currentMinute)}
            onValueChange={handleMinuteChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[240px]">
              {minutes.map((m) => (
                <SelectItem key={m} value={pad2(m)}>
                  {pad2(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
