'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { bookFilming } from '@/lib/actions/book-slot';
import type { ClientAvailability } from '@/lib/actions/booking-availability';
import type { DayAvailability, StartOption } from '@/lib/booking';

interface AvailabilityViewProps {
  availability: ClientAvailability;
}

const toHHMM = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const formatDuration = (minutes: number): string =>
  minutes % 60 === 0 ? `${minutes / 60}ω` : `${minutes}΄`;

const useFormatDate = () => {
  const locale = useLocale();
  return (date: string): string =>
    new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
};

function formatRemaining(remaining: number, unit: string): string {
  if (unit === 'hours') {
    const h = remaining / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}ω`;
  }
  return String(remaining);
}

/** Returns true when every start for this duration is allowance_exhausted */
function isDurationAllowanceExhausted(day: DayAvailability, duration: number): boolean {
  const group = day.durations.find((g) => g.duration === duration);
  if (!group || group.starts.length === 0) return false;
  return group.starts.every((s) => s.reason === 'allowance_exhausted');
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  startTime: string;
  durationMinutes: number;
  onConfirm: (location?: string, note?: string) => Promise<void>;
  loading: boolean;
}

function ConfirmDialog({
  open,
  onOpenChange,
  date,
  startTime,
  durationMinutes,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  const t = useTranslations('booking');
  const formatDate = useFormatDate();
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  const handleConfirm = async () => {
    await onConfirm(location.trim() || undefined, note.trim() || undefined);
    setLocation('');
    setNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {formatDate(date)} — {startTime} ({formatDuration(durationMinutes)})
          </DialogTitle>
          <DialogDescription>{t('bookSlotDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="book-location">{t('optionalLocation')}</Label>
            <Input
              id="book-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-note">{t('optionalNote')}</Label>
            <Textarea
              id="book-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? t('bookingInProgress') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DayCardProps {
  day: DayAvailability;
  durations: number[];
  onBook: (date: string, startTime: string, durationMinutes: number) => void;
}

function DayCard({ day, durations, onBook }: DayCardProps) {
  const t = useTranslations('booking');
  const formatDate = useFormatDate();
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const visibleDurations = durations.filter((d) => !isDurationAllowanceExhausted(day, d));
  const starts: StartOption[] =
    selectedDuration !== null
      ? (day.durations.find((g) => g.duration === selectedDuration)?.starts ?? [])
      : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{formatDate(day.date)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duration chips */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t('chooseDuration')}</p>
          <div className="flex flex-wrap gap-2">
            {visibleDurations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDuration(selectedDuration === d ? null : d)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                  selectedDuration === d
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-primary hover:text-primary',
                )}
              >
                {formatDuration(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Start-time chips */}
        {selectedDuration !== null && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('chooseTime')}</p>
            <div className="flex flex-wrap gap-2">
              {starts.map((s) => {
                if (s.available) {
                  return (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => onBook(day.date, toHHMM(s.start), selectedDuration)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                    >
                      {toHHMM(s.start)}
                    </button>
                  );
                }

                if (s.reason === 'allowance_exhausted') return null;

                return (
                  <div key={s.start} className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{toHHMM(s.start)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {s.reason === 'capacity_full' ? t('full') : t('past')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AvailabilityView({ availability }: AvailabilityViewProps) {
  const t = useTranslations('booking');
  const router = useRouter();

  const { package_name, allowance, remaining_allowance, durations, days } = availability;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<{
    date: string;
    startTime: string;
    durationMinutes: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBook = (date: string, startTime: string, durationMinutes: number) => {
    setPending({ date, startTime, durationMinutes });
    setDialogOpen(true);
  };

  const handleConfirm = async (location?: string, note?: string) => {
    if (!pending) return;
    setLoading(true);

    const result = await bookFilming({
      date: pending.date,
      start_time: pending.startTime,
      duration_minutes: pending.durationMinutes,
      location,
      note,
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t('bookingSuccess'));
    setDialogOpen(false);
    setPending(null);
    router.refresh();
  };

  const openDays = days.filter((d) => d.durations.some((g) => g.starts.some((s) => s.available)));

  const allAllowanceExhausted = remaining_allowance <= 0;

  return (
    <div className="space-y-6">
      {/* Package card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('yourPackage', { name: package_name })}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('remaining', {
            count: formatRemaining(remaining_allowance, allowance.unit),
          })}
        </CardContent>
      </Card>

      {/* Empty states */}
      {allAllowanceExhausted ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('allowanceExhausted')}
          </CardContent>
        </Card>
      ) : openDays.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('noOpenDays')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openDays.map((day) => (
            <DayCard key={day.date} day={day} durations={durations} onBook={handleBook} />
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {pending && (
        <ConfirmDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setPending(null);
          }}
          date={pending.date}
          startTime={pending.startTime}
          durationMinutes={pending.durationMinutes}
          onConfirm={handleConfirm}
          loading={loading}
        />
      )}
    </div>
  );
}
