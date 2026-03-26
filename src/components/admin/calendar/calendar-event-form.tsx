'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  createCalendarEventSchema,
  type CreateCalendarEventInput,
} from '@/lib/schemas/calendar-event';
import { createCalendarEvent, updateCalendarEvent } from '@/lib/actions/calendar-events';
import { CALENDAR_EVENT_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EVENT_TYPE_KEYS } from '@/lib/constants';
import type { CalendarEventRecord } from '@/types';

interface CalendarEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  editEvent?: CalendarEventRecord | null;
  onSuccess: () => void;
}

export function CalendarEventForm({
  open,
  onOpenChange,
  defaultDate,
  editEvent,
  onSuccess,
}: CalendarEventFormProps) {
  const t = useTranslations('calendar');
  const tc = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editEvent;

  const form = useForm<CreateCalendarEventInput>({
    resolver: zodResolver(createCalendarEventSchema),
    defaultValues: {
      title: '',
      description: '',
      start_date: defaultDate ?? new Date().toISOString().split('T')[0],
      end_date: '',
      all_day: true,
      color: '',
      event_type: 'custom',
    },
  });

  const isAllDay = form.watch('all_day');

  // Convert UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
  const utcToLocal = (utcStr: string) => {
    const d = new Date(utcStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (editEvent) {
      form.reset({
        title: editEvent.title,
        description: editEvent.description ?? '',
        start_date: editEvent.all_day
          ? editEvent.start_date.split('T')[0]
          : utcToLocal(editEvent.start_date),
        end_date: editEvent.end_date
          ? editEvent.all_day
            ? editEvent.end_date.split('T')[0]
            : utcToLocal(editEvent.end_date)
          : '',
        all_day: editEvent.all_day,
        color: editEvent.color ?? '',
        event_type: editEvent.event_type,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        start_date: defaultDate ?? new Date().toISOString().split('T')[0],
        end_date: '',
        all_day: true,
        color: '',
        event_type: 'custom',
      });
    }
  }, [editEvent, defaultDate, form]);

  const onSubmit = async (data: CreateCalendarEventInput) => {
    setIsSubmitting(true);

    // datetime-local gives local time without timezone (e.g. "2026-03-26T18:00")
    // Supabase timestamptz needs proper UTC conversion
    // Convert local time to ISO UTC string so Supabase stores correctly
    const toUtc = (dateStr: string) => {
      if (!dateStr || !dateStr.includes('T')) return dateStr;
      return new Date(dateStr).toISOString();
    };

    const payload = {
      ...data,
      start_date: data.all_day ? data.start_date : toUtc(data.start_date),
      end_date: data.end_date ? (data.all_day ? data.end_date : toUtc(data.end_date)) : null,
      color: data.color || null,
      description: data.description || null,
    };

    const result = isEditing
      ? await updateCalendarEvent(editEvent.id, payload)
      : await createCalendarEvent(payload);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? t('updateEventSuccess') : t('createEventSuccess'));
    onOpenChange(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editEvent') : t('addEvent')}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditing ? t('editEvent') : t('addEvent')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventTitle')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('eventTitle')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventTypeLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CALENDAR_EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(EVENT_TYPE_KEYS[type])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">{t('eventAllDay')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('eventStartDate')}</FormLabel>
                    <FormControl>
                      <Input type={isAllDay ? 'date' : 'datetime-local'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('eventEndDate')}</FormLabel>
                    <FormControl>
                      <Input
                        type={isAllDay ? 'date' : 'datetime-local'}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={t('eventDescription')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>{isEditing ? t('saving') : t('creating')}</span>
                  </div>
                ) : isEditing ? (
                  t('editEvent')
                ) : (
                  t('addEvent')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
