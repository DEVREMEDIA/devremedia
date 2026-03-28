'use client';

import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { BookingFormData } from './booking-wizard';

interface StepDatesProps {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
}

const TIME_SLOT_KEYS = ['timeMorning', 'timeAfternoon', 'timeEvening', 'timeFullDay'] as const;

export function StepDates({ formData, updateFormData }: StepDatesProps) {
  const t = useTranslations('booking');
  const [openCalendarIndex, setOpenCalendarIndex] = useState<number | null>(null);
  const [customTimeIndices, setCustomTimeIndices] = useState<Set<number>>(new Set());

  const addPreferredDate = () => {
    updateFormData({
      preferred_dates: [...formData.preferred_dates, { date: '', time_slot: '' }],
    });
  };

  const updatePreferredDate = (index: number, field: 'date' | 'time_slot', value: string) => {
    const newDates = [...formData.preferred_dates];
    newDates[index] = { ...newDates[index], [field]: value };
    updateFormData({ preferred_dates: newDates });
  };

  const removePreferredDate = (index: number) => {
    const newDates = formData.preferred_dates.filter((_, i) => i !== index);
    updateFormData({ preferred_dates: newDates });
  };

  const enableCustomTime = useCallback((index: number) => {
    setCustomTimeIndices((prev) => new Set(prev).add(index));
  }, []);

  const handleSelectTimeChip = (index: number, chipValue: string) => {
    // When selecting a chip, exit custom mode
    setCustomTimeIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    const current = formData.preferred_dates[index].time_slot;
    // Toggle: if same chip selected, clear it
    updatePreferredDate(index, 'time_slot', current === chipValue ? '' : chipValue);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-5 w-5 text-primary" />
          <Label className="font-medium text-base">{t('preferredFilmingDates')}</Label>
        </div>
        <p className="text-sm text-muted-foreground ml-7">{t('preferredDatesHelp')}</p>
      </div>

      {/* Date entries */}
      <div className="space-y-4">
        {formData.preferred_dates.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t('noDatesAdded')}</p>
          </div>
        )}

        {formData.preferred_dates.map((dateInfo, index) => (
          <div key={index} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removePreferredDate(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Date picker */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('selectDate')}</Label>
              <Popover
                open={openCalendarIndex === index}
                onOpenChange={(open) => setOpenCalendarIndex(open ? index : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dateInfo.date && 'text-muted-foreground',
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateInfo.date
                      ? format(new Date(dateInfo.date), 'd MMMM yyyy', { locale: el })
                      : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateInfo.date ? new Date(dateInfo.date) : undefined}
                    onSelect={(day) => {
                      if (day) {
                        updatePreferredDate(index, 'date', format(day, 'yyyy-MM-dd'));
                        setOpenCalendarIndex(null);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time slot chips */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">{t('preferredTime')}</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {TIME_SLOT_KEYS.map((key) => {
                  const chipValue = t(key);
                  const isActive = dateInfo.time_slot === chipValue;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectTimeChip(index, chipValue)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                      )}
                    >
                      {chipValue}
                    </button>
                  );
                })}
              </div>
              {/* Custom time toggle + input */}
              {customTimeIndices.has(index) ||
              (dateInfo.time_slot !== '' &&
                !TIME_SLOT_KEYS.some((key) => t(key) === dateInfo.time_slot)) ? (
                <Input
                  type="text"
                  value={dateInfo.time_slot}
                  onChange={(e) => updatePreferredDate(index, 'time_slot', e.target.value)}
                  placeholder={t('timeSlotPlaceholder')}
                  className="h-9 mt-1"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => enableCustomTime(index)}
                  className="text-xs text-primary hover:underline"
                >
                  {t('timeCustom')}
                </button>
              )}
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addPreferredDate}
          className="w-full gap-2 h-11 border-dashed"
        >
          <Plus className="h-4 w-4" />
          {t('addPreferredDate')}
        </Button>
      </div>
    </div>
  );
}
