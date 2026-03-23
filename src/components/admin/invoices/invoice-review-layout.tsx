'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PdfPreview } from '@/components/shared/pdf-preview';
import { Loader2, Plus, Trash2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReviewForm = UseFormReturn<any>;

interface LineItemEntry {
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceReviewLayoutProps {
  file: File;
  form: ReviewForm;
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

  // Initialize line items from the form's description + net_amount
  const [lineItems, setLineItems] = useState<LineItemEntry[]>(() => {
    const desc = form.getValues('description') || '';
    const net = form.getValues('net_amount') || 0;
    return desc || net ? [{ description: desc, quantity: 1, unit_price: net }] : [];
  });

  // Recalculate totals when line items or vat_percent change
  useEffect(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const vatPercent = form.getValues('vat_percent') || 0;
    const vatAmount = subtotal * (vatPercent / 100);
    const total = subtotal + vatAmount;

    form.setValue('net_amount', Math.round(subtotal * 100) / 100);
    form.setValue('vat_amount', Math.round(vatAmount * 100) / 100);
    form.setValue('total_amount', Math.round(total * 100) / 100);

    // Build combined description for single-item storage
    const combinedDesc = lineItems
      .map((item, i) => (lineItems.length > 1 ? `${i + 1}. ${item.description}` : item.description))
      .join('\n');
    form.setValue('description', combinedDesc || '');
  }, [lineItems, form]);

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, updates: Partial<LineItemEntry>) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

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
              <p className="text-xs text-destructive">
                {String(form.formState.errors.issue_date.message)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Ημ. Λήξης</Label>
            <Input type="date" id="due_date" {...form.register('due_date')} />
          </div>
        </div>

        {/* Line Items as Step Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Υπηρεσίες / Είδη</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-1" />
              Προσθήκη
            </Button>
          </div>

          {lineItems.map((item, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Βήμα {index + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Περιγραφή</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateLineItem(index, { description: e.target.value })}
                    placeholder="Περιγραφή υπηρεσίας..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ποσότητα</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, { quantity: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Τιμή μονάδας (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateLineItem(index, { unit_price: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-muted-foreground">
                  Σύνολο: €{(item.quantity * item.unit_price).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          ))}

          {lineItems.length === 0 && (
            <Button type="button" variant="outline" className="w-full" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Προσθήκη υπηρεσίας
            </Button>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Καθαρή Αξία (€)</Label>
              <Input
                type="number"
                step="0.01"
                readOnly
                value={subtotal.toFixed(2)}
                className="bg-muted"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vat_percent">ΦΠΑ %</Label>
              <Input
                type="number"
                id="vat_percent"
                {...form.register('vat_percent')}
                onChange={(e) => {
                  form.setValue('vat_percent', parseFloat(e.target.value) || 0);
                  // Force recalc
                  setLineItems((prev) => [...prev]);
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ποσό ΦΠΑ (€)</Label>
              <Input
                type="number"
                step="0.01"
                readOnly
                value={(subtotal * ((form.getValues('vat_percent') || 0) / 100)).toFixed(2)}
                className="bg-muted"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-bold">Σύνολο (€)</Label>
              <Input
                type="number"
                step="0.01"
                readOnly
                value={(subtotal + subtotal * ((form.getValues('vat_percent') || 0) / 100)).toFixed(
                  2,
                )}
                className="bg-muted font-bold"
              />
            </div>
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
