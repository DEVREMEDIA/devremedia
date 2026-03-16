'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  ExternalLink,
  FolderOpen,
  User,
  Tag,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CalendarEventForm } from './calendar-event-form';
import { deleteCalendarEvent } from '@/lib/actions/calendar-events';
import type { CalendarEvent } from '@/lib/queries/calendar';
import { EVENT_TYPE_KEYS } from '@/lib/constants';
import type { CalendarEventRecord } from '@/types';

interface EventDialogProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventMutated?: () => void;
}

export function EventDialog({ event, open, onOpenChange, onEventMutated }: EventDialogProps) {
  const router = useRouter();
  const t = useTranslations('calendar');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCustom = event.type === 'custom';

  const getEventLink = () => {
    switch (event.type) {
      case 'project':
        return `/admin/projects/${event.entityId}`;
      case 'task':
        return `/admin/projects/${event.entityId}#tasks`;
      case 'invoice':
        return `/admin/invoices/${event.entityId}`;
      default:
        return '';
    }
  };

  const getTypeLabel = () => {
    if (isCustom && event.eventType) {
      return t(EVENT_TYPE_KEYS[event.eventType] ?? 'eventTypeCustom');
    }
    switch (event.type) {
      case 'project':
        return t('filterProject');
      case 'task':
        return t('filterTask');
      case 'invoice':
        return t('filterInvoice');
      default:
        return t('filterCustom');
    }
  };

  const getEventKind = () => {
    if (isCustom && event.eventType) {
      return t(EVENT_TYPE_KEYS[event.eventType] ?? 'eventTypeCustom');
    }
    if (event.type === 'project') {
      return event.subtype === 'deadline' ? t('projectDeadline') : t('projectStart');
    }
    if (event.type === 'task') return t('taskDue');
    return t('invoiceDue');
  };

  const handleViewDetails = () => {
    const link = getEventLink();
    if (link) {
      router.push(link);
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCalendarEvent(event.entityId);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t('deleteEventSuccess'));
    setIsDeleteOpen(false);
    onOpenChange(false);
    onEventMutated?.();
  };

  const editRecord: CalendarEventRecord = {
    id: event.entityId,
    title: event.title,
    description: event.description ?? null,
    start_date: event.start,
    end_date: event.end ?? null,
    all_day: event.allDay ?? true,
    color: null,
    event_type: event.eventType ?? 'custom',
    created_by: '',
    created_at: '',
    updated_at: '',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <DialogTitle className="flex items-center gap-2">
                {event.title}
                <Badge variant="secondary" className="text-xs">
                  {getTypeLabel()}
                </Badge>
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              {getEventKind()} — {format(new Date(event.start), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {format(new Date(event.start), 'EEEE, MMMM d, yyyy')}
                {event.end && ` — ${format(new Date(event.end), 'EEEE, MMMM d, yyyy')}`}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{getEventKind()}</span>
            </div>

            {event.projectTitle && (
              <div className="flex items-center gap-3 text-sm">
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{event.projectTitle}</span>
              </div>
            )}

            {event.clientName && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{event.clientName}</span>
              </div>
            )}

            {isCustom && event.description && (
              <div className="flex items-start gap-3 text-sm">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">{event.description}</p>
              </div>
            )}

            {isCustom ? (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    setIsEditOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('editEvent')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('deleteEvent')}
                </Button>
              </div>
            ) : (
              <Button onClick={handleViewDetails} className="mt-4 w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('viewDetails')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isCustom && (
        <>
          <CalendarEventForm
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            editEvent={editRecord}
            onSuccess={() => {
              setIsEditOpen(false);
              onEventMutated?.();
            }}
          />

          <ConfirmDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            title={t('deleteEvent')}
            description={t('deleteEventConfirm')}
            confirmLabel={t('deleteEvent')}
            loading={isDeleting}
            destructive
            onConfirm={handleDelete}
          />
        </>
      )}
    </>
  );
}
