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
  /** Όταν η υποβολή καταστρέφει κάτι. Το κέλυφος δεν αλλάζει, η σημασία αλλάζει. */
  submitVariant?: 'default' | 'destructive';
}

/**
 * Το κοινό κέλυφος ενός διαλόγου φόρμας: τίτλος, περιγραφή, τα πεδία, και ένα
 * υποσέλιδο που δεν ξαναγράφεται σε κάθε αρχείο.
 *
 * ΤΙ ΔΕΝ ΕΙΝΑΙ: δεν είναι wizard πολλών βημάτων, δεν είναι `Sheet` που αλλάζει
 * πλάτος ανά βήμα, δεν είναι επιλογέας, δεν είναι οθόνη ανάγνωσης. Αυτά
 * υπάρχουν στην περιοχή και μένουν όπως είναι — ένα κέλυφος που τα καταπίνει
 * όλα αποκτά ένα prop για το καθένα και παύει να είναι κέλυφος.
 *
 * Εξαίρεση: `submitVariant`. Δεν είναι μια ακόμα ιδιότητα μιας συγκεκριμένης
 * φόρμας — είναι ιδιότητα του υποσέλιδου που το κέλυφος ήδη κατέχει. "Αυτή η
 * υποβολή καταστρέφει κάτι" περιγράφει φόρμες γενικά, όχι μία περίπτωση, γι'
 * αυτό επιτράπηκε. Δεν είναι το πρώτο βήμα μιας λίστας — αν χρειαστεί μια
 * δεύτερη τέτοια ιδιότητα, ξανασκέψου το σχήμα, μην προσθέσεις απλώς άλλο prop.
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
  submitVariant = 'default',
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
            <Button type="submit" variant={submitVariant} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
