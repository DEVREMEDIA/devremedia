'use client';

import { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PdfPreview } from '@/components/shared/pdf-preview';
import { Loader2 } from 'lucide-react';

interface ReviewFormValues {
  issue_date: string;
  due_date: string;
  description: string;
  net_amount: number;
  vat_percent: number;
  vat_amount: number;
  total_amount: number;
  project_id?: string;
  notes?: string;
  invoice_number?: string;
  invoice_type?: string;
  mark?: string;
  issuer_name?: string;
  issuer_afm?: string;
}

interface InvoiceReviewLayoutProps {
  file: File;
  form: UseFormReturn<ReviewFormValues>;
  projects: { id: string; title: string }[];
  isSaving: boolean;
  onSubmit: () => void;
  onChangeFile: () => void;
}

export function InvoiceReviewLayout({
  file,
  form,
  projects,
  isSaving,
  onSubmit,
  onChangeFile,
}: InvoiceReviewLayoutProps) {
  const watched = form.watch();

  return (
    <form onSubmit={onSubmit} className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Left: PDF Preview (40%) */}
      <PdfPreview file={file} className="w-2/5 min-w-0 shrink-0" />

      {/* Right: Editable form (60%) */}
      <div className="w-3/5 overflow-y-auto space-y-4 pr-2">
        {/* Read-only context from OCR */}
        {(watched.issuer_name || watched.issuer_afm) && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
            {watched.issuer_name && (
              <p>
                <span className="font-medium">Εκδότης:</span> {watched.issuer_name}
              </p>
            )}
            {watched.issuer_afm && (
              <p>
                <span className="font-medium">ΑΦΜ Εκδότη:</span> {watched.issuer_afm}
              </p>
            )}
            {watched.invoice_type && (
              <p>
                <span className="font-medium">Τύπος:</span> {watched.invoice_type}
              </p>
            )}
            {watched.mark && (
              <p>
                <span className="font-medium">ΜΑΡΚ:</span> {watched.mark}
              </p>
            )}
            {watched.invoice_number && (
              <p>
                <span className="font-medium">Αρ. Τιμολογίου:</span> {watched.invoice_number}
              </p>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="issue_date">Ημ. Έκδοσης</Label>
            <Input type="date" id="issue_date" {...form.register('issue_date')} />
            {form.formState.errors.issue_date && (
              <p className="text-xs text-destructive">{form.formState.errors.issue_date.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Ημ. Λήξης</Label>
            <Input type="date" id="due_date" {...form.register('due_date')} />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Περιγραφή</Label>
          <Textarea id="description" rows={3} {...form.register('description')} />
          {form.formState.errors.description && (
            <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
          )}
        </div>

        {/* Amounts row 1 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="net_amount">Καθαρή Αξία (€)</Label>
            <Input type="number" step="0.01" id="net_amount" {...form.register('net_amount')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vat_percent">ΦΠΑ %</Label>
            <Input type="number" id="vat_percent" {...form.register('vat_percent')} />
          </div>
        </div>

        {/* Amounts row 2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="vat_amount">Ποσό ΦΠΑ (€)</Label>
            <Input type="number" step="0.01" id="vat_amount" {...form.register('vat_amount')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="total_amount">Σύνολο (€)</Label>
            <Input type="number" step="0.01" id="total_amount" {...form.register('total_amount')} />
          </div>
        </div>

        {/* Project */}
        <div className="space-y-1.5">
          <Label htmlFor="project_id">Project (προαιρετικό)</Label>
          <Select
            value={watched.project_id ?? ''}
            onValueChange={(v) => form.setValue('project_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Σημειώσεις</Label>
          <Textarea id="notes" rows={2} {...form.register('notes')} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onChangeFile}>
            Αλλαγή PDF
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Αποθήκευση
          </Button>
        </div>
      </div>
    </form>
  );
}
