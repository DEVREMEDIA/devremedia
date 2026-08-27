'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Τα πεδία. Το `<form>` και το υποσέλιδο τα δίνει το κέλυφος. */
  children: ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel: string;
  /** Όσο τρέχει η υποβολή: κλειδώνει και τα δύο κουμπιά και το κλείσιμο. */
  submitting?: boolean;
  /** Πλάτος, όταν η προεπιλογή δεν φτάνει. */
  className?: string;
}

/**
 * Το κοινό κέλυφος ενός διαλόγου φόρμας: τίτλος, περιγραφή, τα πεδία, και ένα
 * υποσέλιδο που δεν ξαναγράφεται σε κάθε αρχείο.
 *
 * ΤΙ ΔΕΝ ΕΙΝΑΙ: δεν είναι wizard πολλών βημάτων, δεν είναι `Sheet` που αλλάζει
 * πλάτος ανά βήμα, δεν είναι επιλογέας, δεν είναι οθόνη ανάγνωσης. Αυτά
 * υπάρχουν στην περιοχή και μένουν όπως είναι — ένα κέλυφος που τα καταπίνει
 * όλα αποκτά ένα prop για το καθένα και παύει να είναι κέλυφος.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitting = false,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className={cn('max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/*
           * Πάντα υπάρχει περιγραφή, ακόμα κι όταν δεν υπάρχει τι να πει: το
           * Radix τη θέλει για το `aria-describedby`, και ένας διάλογος χωρίς
           * αυτήν φτάνει στον αναγνώστη οθόνης μόνο με τον τίτλο του. Όταν ο
           * καλών δεν δίνει κείμενο, μένει αόρατη.
           */}
          <DialogDescription className={description ? undefined : 'sr-only'}>
            {description ?? title}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-4"
        >
          {children}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {cancelLabel}
            </Button>
            {/*
             * Το κέλυφος κατέχει το υποσέλιδο, άρα κατέχει και το να δείχνει
             * ότι κάτι τρέχει. Χωρίς αυτό, κάθε διάλογος που μετακομίζει εδώ
             * χάνει τον δείκτη προόδου που είχε και μένει με ένα απλώς
             * απενεργοποιημένο κουμπί.
             */}
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
