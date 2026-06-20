'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { bookSlot } from '@/lib/actions/book-slot';

interface BookSlotButtonProps {
  date: string;
  slotId: string;
  slotName: string;
  dateLabel: string;
}

export function BookSlotButton({ date, slotId, slotName, dateLabel }: BookSlotButtonProps) {
  const t = useTranslations('booking');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const result = await bookSlot({
      date,
      slot_id: slotId,
      location: location.trim() || undefined,
      note: note.trim() || undefined,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t('bookingSuccess'));
    setOpen(false);
    setLocation('');
    setNote('');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          {t('bookSlot')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bookSlotTitle', { date: dateLabel, slot: slotName })}</DialogTitle>
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
            {loading ? t('bookingInProgress') : t('confirmBooking')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
