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
import { getTeamMembers } from '@/lib/actions/team';
import { CALENDAR_EVENT_TYPES } from '@/lib/constants';
import type { UserProfile } from '@/types';
import { FormDialog } from '@/components/shared/form-dialog';
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
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
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
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
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
      assigned_to: null,
    },
  });

  const isAllDay = form.watch('all_day');
  const watchedStartDate = form.watch('start_date');
  const watchedEventType = form.watch('event_type');
  const isFilming = watchedEventType === 'filming';

  // Lazy-load team members the first time a filming event is selected.
  useEffect(() => {
    if (!isFilming || teamMembers.length > 0 || isLoadingTeam) return;
    setIsLoadingTeam(true);
    getTeamMembers()
      .then((result) => {
        if (!result.error && result.data) {
          setTeamMembers(
            result.data.filter(
              (m) => m.role === 'employee' || m.role === 'admin' || m.role === 'super_admin',
            ),
          );
        }
      })
      .finally(() => setIsLoadingTeam(false));
  }, [isFilming, teamMembers.length, isLoadingTeam]);

  // Auto-copy start_date to end_date when start changes and end is empty or matches previous start
  useEffect(() => {
    if (!watchedStartDate) return;
    const currentEnd = form.getValues('end_date');
    if (!currentEnd) {
      form.setValue('end_date', watchedStartDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedStartDate]);

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
        assigned_to: editEvent.assigned_to ?? null,
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
        assigned_to: null,
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
      // Only persist assignment for filming-type events; clear it otherwise.
      assigned_to: data.event_type === 'filming' ? data.assigned_to || null : null,
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

  const submitLabel = isSubmitting
    ? isEditing
      ? t('saving')
      : t('creating')
    : isEditing
      ? t('editEvent')
      : t('addEvent');

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t('editEvent') : t('addEvent')}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={submitLabel}
      cancelLabel={tc('cancel')}
      submitting={isSubmitting}
    >
      <Form {...form}>
        <div className="space-y-4">
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

          {isFilming && (
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventAssignedTo')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                    value={field.value ?? '__none__'}
                    disabled={isLoadingTeam}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={isLoadingTeam ? tc('loading') : t('selectAssignee')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t('unassigned')}</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.display_name ?? m.id.slice(0, 8)}
                          {m.role !== 'employee' ? ` (${m.role})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventStartDate')}</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      mode={isAllDay ? 'date' : 'datetime'}
                      value={field.value}
                      onChange={field.onChange}
                    />
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
                    <DateTimePicker
                      mode={isAllDay ? 'date' : 'datetime'}
                      value={field.value}
                      onChange={field.onChange}
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
        </div>
      </Form>
    </FormDialog>
  );
}
