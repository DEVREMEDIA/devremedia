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
          {description ? <DialogDescription>{description}</DialogDescription> : null}
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
            <Button type="submit" disabled={submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
