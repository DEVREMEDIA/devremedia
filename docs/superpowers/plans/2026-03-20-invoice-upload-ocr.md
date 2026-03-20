# Invoice Upload with OCR Parsing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual invoice creation with PDF upload → OCR parse → editable review → save with file storage.

**Architecture:** Next.js API route extracts text from uploaded PDFs (pdfjs-dist text layer first, tesseract.js OCR fallback with canvas rendering). Side-by-side review UI in widened drawer. PDF stored in Supabase Storage, structured data in invoices table.

**Tech Stack:** Next.js 16 App Router, pdfjs-dist, tesseract.js, canvas (node-canvas), Supabase Storage, react-hook-form + Zod, shadcn/ui Sheet

**Spec:** `docs/superpowers/specs/2026-03-20-invoice-upload-ocr-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/00027_invoice_file_path.sql` | Create | DB migration: `file_path` column + storage bucket + RLS |
| `src/types/entities.ts` | Modify | Add `file_path` to `Invoice` type |
| `src/lib/schemas/invoice.ts` | Modify | Add `file_path` to `createInvoiceSchema` |
| `src/lib/invoice-parser.ts` | Create | Regex extraction functions (ported from Python) |
| `src/app/api/invoices/parse/route.ts` | Create | POST API route: text-layer + OCR → ParsedInvoice |
| `src/components/shared/file-upload-dropzone.tsx` | Modify | Add `multiple` prop |
| `src/components/shared/pdf-preview.tsx` | Create | PDF viewer with iframe + blob URL |
| `src/components/admin/invoices/invoice-upload-form.tsx` | Create | Upload step + form logic + save handler |
| `src/components/admin/invoices/invoice-review-layout.tsx` | Create | Side-by-side layout: PDF left, editable form right |
| `src/components/admin/clients/client-drawer.tsx` | Modify | Swap InvoiceForm → InvoiceUploadForm, dynamic width |
| `src/lib/actions/invoices.ts` | Modify | file_path in all selects + storage cleanup on delete |
| `src/components/admin/clients/client-invoices-tab.tsx` | Modify | Download original PDF button |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
pnpm add pdfjs-dist tesseract.js canvas
```

`pdfjs-dist` — text layer extraction. `tesseract.js` — OCR fallback. `canvas` — Node.js canvas for pdfjs-dist page rendering (required for OCR to rasterize PDF pages into images).

- [ ] **Step 2: Verify pdfjs-dist entry point**

```bash
ls node_modules/pdfjs-dist/build/
```

Confirm `pdf.mjs` exists (v4+) or `pdf.js` (v3). Note the exact filename for Task 4.

If only `pdf.mjs` exists (no `legacy/` dir), the import path is `pdfjs-dist/build/pdf.mjs`.
If `legacy/build/pdf.mjs` exists, use that for Node.js compatibility.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add pdfjs-dist, tesseract.js, and canvas for invoice OCR"
```

---

## Task 2: Database Migration + Type Updates

**Files:**
- Create: `supabase/migrations/00027_invoice_file_path.sql`
- Modify: `src/types/entities.ts` (Invoice type, line ~131)
- Modify: `src/lib/schemas/invoice.ts` (createInvoiceSchema, line ~29)

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/00027_invoice_file_path.sql`:

```sql
-- Add file_path column to invoices for uploaded PDF storage
ALTER TABLE invoices ADD COLUMN file_path TEXT;

-- Create private storage bucket for invoice PDFs (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload/read/delete all invoice files
-- WITH CHECK required for INSERT/UPDATE operations
CREATE POLICY "Admins full access to invoices bucket"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'invoices'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Storage RLS: clients can read their own invoice files
CREATE POLICY "Clients read own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM clients
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
```

- [ ] **Step 2: Add `file_path` to Invoice type**

In `src/types/entities.ts`, add after `paid_at: string | null;` (line ~131):

```typescript
  file_path: string | null;
```

- [ ] **Step 3: Add `file_path` to createInvoiceSchema**

In `src/lib/schemas/invoice.ts`, add after the `currency` field (line ~29):

```typescript
  file_path: z.string().nullable().optional(),
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00027_invoice_file_path.sql src/types/entities.ts src/lib/schemas/invoice.ts
git commit -m "feat(invoices): add file_path column, storage bucket, and RLS policies"
```

---

## Task 3: Invoice Parser — TypeScript Port

Pure logic module with no side effects. All regex extraction ported from the Python `parse_invoice.py`.

**Files:**
- Create: `src/lib/invoice-parser.ts`

- [ ] **Step 1: Create `src/lib/invoice-parser.ts`**

```typescript
/**
 * Invoice text parser — extracts structured data from Greek invoice text.
 * Ported from parse_invoice.py. Works with OCR output or PDF text layer.
 */

export interface ParsedInvoice {
  date: string | null
  invoiceNumber: string | null
  invoiceType: string | null
  mark: string | null
  issuerName: string | null
  issuerAfm: string | null
  customerName: string | null
  customerAfm: string | null
  description: string | null
  netAmount: number | null
  vatPercent: number | null
  vatAmount: number | null
  totalAmount: number | null
}

/** Parse EU format amount: "1.240,00" → 1240.00 */
export function parseEuAmount(s: string): number | null {
  const cleaned = s.trim().replace(/\s/g, '')

  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  if (/^\d+(,\d{1,2})$/.test(cleaned)) {
    return parseFloat(cleaned.replace(',', '.'))
  }
  if (/^\d+(\.\d{1,2})$/.test(cleaned)) {
    return parseFloat(cleaned)
  }
  if (/^\d+$/.test(cleaned)) {
    return parseFloat(cleaned)
  }
  return null
}

/** Extract dates (DD/MM/YYYY etc.) → convert to YYYY-MM-DD */
export function extractDates(text: string): string[] {
  const pattern = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/g
  const dates: string[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const [, d, m, y] = match
    const day = parseInt(d, 10)
    const month = parseInt(m, 10)
    const year = parseInt(y, 10)

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2099) {
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      if (!dates.includes(iso)) dates.push(iso)
    }
  }
  return dates
}

/** Extract ΑΦΜ (9-digit numbers after ΑΦΜ/Α.Φ.Μ.) */
export function extractAfm(text: string): { issuerAfm: string | null; customerAfm: string | null } {
  const matches = text.match(/(?:ΑΦΜ|Α\.?Φ\.?Μ\.?)\s*:?\s*(\d{9})/g)
  const afms: string[] = []

  if (matches) {
    for (const m of matches) {
      const digits = m.match(/(\d{9})/)
      if (digits && !afms.includes(digits[1])) afms.push(digits[1])
    }
  }

  return { issuerAfm: afms[0] ?? null, customerAfm: afms[1] ?? null }
}

/** Extract invoice number, type (ΤΠΥ/ΤΔΑ/ΑΠΥ), and ΜΑΡΚ */
export function extractInvoiceNumber(text: string): {
  invoiceNumber: string | null
  invoiceType: string | null
  mark: string | null
} {
  const result = { invoiceNumber: null as string | null, invoiceType: null as string | null, mark: null as string | null }

  const typeMatch = text.match(/(ΤΠΥ|ΤΔΑ|ΑΠΥ|ΤΠΑ)\s+(?:(\d+)\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{10,20})?/)
  if (typeMatch) {
    result.invoiceType = typeMatch[1]
    if (typeMatch[2]) result.invoiceNumber = typeMatch[2]
    if (typeMatch[4]) result.mark = typeMatch[4]
  }

  if (!result.invoiceNumber) {
    const aaMatch = text.match(/Α\.?Α\.?\s*:?\s*(\d+)/)
    if (aaMatch) result.invoiceNumber = aaMatch[1]
  }
  if (!result.mark) {
    const markMatch = text.match(/ΜΑΡΚ\s*:?\s*(\d{10,20})/)
    if (markMatch) result.mark = markMatch[1]
  }
  if (!result.invoiceType) {
    const seiraMatch = text.match(/Σειρά\s*:?\s*([A-ZΑ-Ω]{1,5})/)
    if (seiraMatch) result.invoiceType = seiraMatch[1]
  }

  return result
}

/** Extract amounts: Πληρωτέο, Καθαρή αξία, ΦΠΑ */
export function extractAmounts(text: string): {
  netAmount: number | null
  vatPercent: number | null
  vatAmount: number | null
  totalAmount: number | null
} {
  const result = { netAmount: null as number | null, vatPercent: null as number | null, vatAmount: null as number | null, totalAmount: null as number | null }

  const pliroteoMatch = text.match(/Πληρωτέο\s*\(?€?\)?\s*:?\s*([\d.,]+)/)
  if (pliroteoMatch) result.totalAmount = parseEuAmount(pliroteoMatch[1])

  const synolaMatch = text.match(/Σύνολα?\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/)
  if (synolaMatch) {
    const vals = [1, 2, 3, 4].map(i => parseEuAmount(synolaMatch[i]))
    const nonZero = vals.filter((v): v is number => v !== null && v > 0)
    if (nonZero.length >= 2) {
      result.netAmount = nonZero[0]
      if (nonZero.length >= 3) result.vatAmount = nonZero[1]
    }
  }

  const axiaMatch = text.match(/Συνολ\.?\s*Αξία[^0-9]*([\d.,]+)/)
  if (axiaMatch) {
    const v = parseEuAmount(axiaMatch[1])
    if (v && v > 0) result.netAmount = result.netAmount ?? v
  }

  const fpaMatch = text.match(/(\d{1,2})\s*%/)
  if (fpaMatch) result.vatPercent = parseInt(fpaMatch[1], 10)

  const itemRow = text.match(/([\d][\d.,]+)\s+0,00\s+([\d][\d.,]+)\s+(\d+)%\s+([\d][\d.,]+)\s+([\d][\d.,]+)/)
  if (itemRow) {
    result.netAmount = result.netAmount ?? parseEuAmount(itemRow[2])
    result.vatPercent = result.vatPercent ?? parseInt(itemRow[3], 10)
    result.vatAmount = result.vatAmount ?? parseEuAmount(itemRow[4])
  }

  if (!result.totalAmount) {
    const allAmounts = text.match(/[\d]{1,3}(?:\.[\d]{3})*,\d{2}/g)
    if (allAmounts) {
      const parsed = allAmounts.map(a => parseEuAmount(a)).filter((v): v is number => v !== null)
      if (parsed.length > 0) result.totalAmount = Math.max(...parsed)
    }
  }

  return result
}

/** Extract issuer and customer names (Επωνυμία) */
export function extractNames(text: string): { issuerName: string | null; customerName: string | null } {
  const result = { issuerName: null as string | null, customerName: null as string | null }

  const names = [...text.matchAll(/Επωνυμ[ίι]α\s*:?\s*(.+)/g)]
  if (names.length >= 1) result.issuerName = names[0][1].trim()
  if (names.length >= 2) result.customerName = names[1][1].trim()

  if (!result.customerName) {
    const pelatiMatch = text.match(/Στοιχεία\s*Πελάτη[\s\S]*?Α\.?Φ\.?Μ\.?\s*:?\s*\d{9}\s*\n\s*(.+)/)
    if (pelatiMatch) {
      let name = pelatiMatch[1].trim().split('\n')[0].trim()
      name = name.replace(/^Επωνυμ[ίι]α\s*:?\s*/, '')
      if (name.length > 2) result.customerName = name
    }
  }

  return result
}

/** Extract service/product description */
export function extractDescription(text: string): string | null {
  const match = text.match(/Περιγραφή[\s\S]*?\n([\s\S]+?)(?:Σύνολα|Σύνολο)/)
  if (!match) return null

  const words: string[] = []
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim()
    if (/^[\d.,\s%€]+$/.test(trimmed)) continue
    const cleaned = trimmed.replace(/[0-9.,€%\s]/g, '')
    if (cleaned.length > 2) words.push(cleaned)
  }

  return words.length > 0 ? words.join(' ').trim() : null
}

/** Main parser: extract all fields from invoice text */
export function parseInvoiceText(text: string): ParsedInvoice {
  const dates = extractDates(text)
  const afm = extractAfm(text)
  const amounts = extractAmounts(text)
  const invoiceNum = extractInvoiceNumber(text)
  const names = extractNames(text)

  return {
    date: dates[0] ?? null,
    invoiceNumber: invoiceNum.invoiceNumber,
    invoiceType: invoiceNum.invoiceType,
    mark: invoiceNum.mark,
    issuerName: names.issuerName,
    issuerAfm: afm.issuerAfm,
    customerName: names.customerName,
    customerAfm: afm.customerAfm,
    description: extractDescription(text),
    netAmount: amounts.netAmount,
    vatPercent: amounts.vatPercent,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
  }
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/invoice-parser.ts
git commit -m "feat(invoices): add invoice text parser with Greek regex extraction"
```

---

## Task 4: API Route — POST /api/invoices/parse

**Files:**
- Create: `src/app/api/invoices/parse/route.ts`

**Key detail:** tesseract.js `recognize()` expects image data (PNG/JPEG), NOT PDF binary. For scanned PDFs, we must rasterize pages to PNG using pdfjs-dist + canvas, then pass each PNG to tesseract.

- [ ] **Step 1: Verify pdfjs-dist import path from Task 1**

Check which path exists:
```bash
ls node_modules/pdfjs-dist/build/pdf.mjs 2>/dev/null && echo "v4+" || ls node_modules/pdfjs-dist/legacy/build/pdf.mjs 2>/dev/null && echo "v3 legacy"
```

Use the found path in the import below. Replace `PDFJS_IMPORT_PATH` with the verified path.

- [ ] **Step 2: Create the API route**

Create `src/app/api/invoices/parse/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseInvoiceText } from '@/lib/invoice-parser'
import type { ParsedInvoice } from '@/lib/invoice-parser'

export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MIN_TEXT_LENGTH = 50

export async function POST(request: NextRequest): Promise<NextResponse<ParsedInvoice | { error: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Strategy 1: Text layer extraction (fast, works for digital PDFs)
    let text = await extractTextLayer(buffer)

    // Strategy 2: OCR fallback (slow, for scanned PDFs)
    if (text.length < MIN_TEXT_LENGTH) {
      text = await ocrFallback(buffer)
    }

    // If still no text, return empty result — user fills form manually
    if (text.length < MIN_TEXT_LENGTH) {
      const empty: ParsedInvoice = {
        date: null, invoiceNumber: null, invoiceType: null, mark: null,
        issuerName: null, issuerAfm: null, customerName: null, customerAfm: null,
        description: null, netAmount: null, vatPercent: null, vatAmount: null, totalAmount: null,
      }
      return NextResponse.json(empty)
    }

    return NextResponse.json(parseInvoiceText(text))
  } catch (err: unknown) {
    console.error('Invoice parse error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse invoice' },
      { status: 500 },
    )
  }
}

/** Extract text layer from PDF using pdfjs-dist (no canvas needed) */
async function extractTextLayer(buffer: Buffer): Promise<string> {
  try {
    // NOTE: Adjust import path based on Task 1 Step 2 findings
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
    const textParts: string[] = []

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .filter((item): item is { str: string } => 'str' in item)
        .map(item => item.str)
        .join(' ')
      textParts.push(pageText)
    }

    return textParts.join('\n')
  } catch (err) {
    console.error('PDF text extraction failed:', err)
    return ''
  }
}

/** OCR fallback: render PDF pages to PNG via canvas, then tesseract */
async function ocrFallback(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
    const { createCanvas } = await import('canvas')
    const Tesseract = await import('tesseract.js')

    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
    const worker = await Tesseract.createWorker('ell+eng')
    const textParts: string[] = []

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 2.0 }) // 2x for better OCR
      const canvas = createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')

      // pdfjs-dist render expects CanvasRenderingContext2D — node-canvas provides this
      await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise

      const pngBuffer = canvas.toBuffer('image/png')
      const { data: { text } } = await worker.recognize(pngBuffer)
      textParts.push(text)
    }

    await worker.terminate()
    return textParts.join('\n')
  } catch (err) {
    console.error('OCR fallback failed:', err)
    return ''
  }
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

If pdfjs-dist import path fails, adjust based on Task 1 Step 2 findings.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/invoices/parse/route.ts
git commit -m "feat(invoices): add PDF parse API route with text-layer + OCR fallback"
```

---

## Task 5: Update FileUploadDropzone — Add `multiple` Prop

**Files:**
- Modify: `src/components/shared/file-upload-dropzone.tsx`

- [ ] **Step 1: Add `multiple` prop to interface and wire it up**

In `src/components/shared/file-upload-dropzone.tsx`:

1. Add `multiple?: boolean` to the props interface
2. Destructure `multiple = true` from props (backward compat)
3. Find the `<input type="file"` element and replace hardcoded `multiple` with `multiple={multiple}`

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/file-upload-dropzone.tsx
git commit -m "feat(shared): add multiple prop to FileUploadDropzone"
```

---

## Task 6: PdfPreview Component

**Files:**
- Create: `src/components/shared/pdf-preview.tsx`

- [ ] **Step 1: Create PdfPreview component**

Create `src/components/shared/pdf-preview.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfPreviewProps {
  file: File
  className?: string
}

export function PdfPreview({ file, className }: PdfPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!blobUrl) return null

  return (
    <div className={className}>
      <iframe
        src={blobUrl}
        className="h-full w-full rounded-md border"
        title="Invoice PDF Preview"
      />
      <div className="mt-2 text-center">
        <Button variant="outline" size="sm" asChild>
          <a href={blobUrl} download={file.name}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build & commit**

```bash
pnpm build && git add src/components/shared/pdf-preview.tsx && git commit -m "feat(shared): add PdfPreview component with iframe blob URL"
```

---

## Task 7: InvoiceReviewLayout — Side-by-Side Review Form

Extracted from InvoiceUploadForm to keep both files under 300 lines.

**Files:**
- Create: `src/components/admin/invoices/invoice-review-layout.tsx`

- [ ] **Step 1: Create InvoiceReviewLayout component**

Create `src/components/admin/invoices/invoice-review-layout.tsx`:

```typescript
'use client'

import { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PdfPreview } from '@/components/shared/pdf-preview'
import { Loader2 } from 'lucide-react'

interface ReviewFormValues {
  issue_date: string
  due_date: string
  description: string
  net_amount: number
  vat_percent: number
  vat_amount: number
  total_amount: number
  project_id?: string
  notes?: string
  invoice_number?: string
  invoice_type?: string
  mark?: string
  issuer_name?: string
  issuer_afm?: string
}

interface InvoiceReviewLayoutProps {
  file: File
  form: UseFormReturn<ReviewFormValues>
  projects: { id: string; title: string }[]
  isSaving: boolean
  onSubmit: () => void
  onChangeFile: () => void
}

export function InvoiceReviewLayout({
  file,
  form,
  projects,
  isSaving,
  onSubmit,
  onChangeFile,
}: InvoiceReviewLayoutProps) {
  const watched = form.watch()

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
              <p><span className="font-medium">Εκδότης:</span> {watched.issuer_name}</p>
            )}
            {watched.issuer_afm && (
              <p><span className="font-medium">ΑΦΜ Εκδότη:</span> {watched.issuer_afm}</p>
            )}
            {watched.invoice_type && (
              <p><span className="font-medium">Τύπος:</span> {watched.invoice_type}</p>
            )}
            {watched.mark && (
              <p><span className="font-medium">ΜΑΡΚ:</span> {watched.mark}</p>
            )}
            {watched.invoice_number && (
              <p><span className="font-medium">Αρ. Τιμολογίου:</span> {watched.invoice_number}</p>
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
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
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
  )
}
```

- [ ] **Step 2: Verify build & commit**

```bash
pnpm build && git add src/components/admin/invoices/invoice-review-layout.tsx && git commit -m "feat(invoices): add InvoiceReviewLayout side-by-side component"
```

---

## Task 8: InvoiceUploadForm — Upload + Orchestrator

Now a thin orchestrator: upload step + form state + save handler. Review UI delegated to InvoiceReviewLayout.

**Files:**
- Create: `src/components/admin/invoices/invoice-upload-form.tsx`

- [ ] **Step 1: Create InvoiceUploadForm component**

Create `src/components/admin/invoices/invoice-upload-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { FileUploadDropzone } from '@/components/shared/file-upload-dropzone'
import { InvoiceReviewLayout } from '@/components/admin/invoices/invoice-review-layout'
import { createInvoice } from '@/lib/actions/invoices'
import { createClient } from '@/lib/supabase/client'
import type { ParsedInvoice } from '@/lib/invoice-parser'

interface InvoiceUploadFormProps {
  clientId: string
  projects: { id: string; title: string; client_id: string }[]
  nextInvoiceNumber: string
  onSuccess: () => void
  onStepChange?: (step: 'upload' | 'review') => void
}

const reviewFormSchema = z.object({
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  description: z.string().min(1, 'Description is required'),
  net_amount: z.coerce.number().min(0),
  vat_percent: z.coerce.number().min(0).max(100),
  vat_amount: z.coerce.number().min(0),
  total_amount: z.coerce.number().min(0),
  project_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  invoice_number: z.string().optional(),
  invoice_type: z.string().optional(),
  mark: z.string().optional(),
  issuer_name: z.string().optional(),
  issuer_afm: z.string().optional(),
})

type ReviewFormValues = z.input<typeof reviewFormSchema>

/** Compute due_date as issue_date + 30 days */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function InvoiceUploadForm({
  clientId,
  projects,
  onSuccess,
  onStepChange,
}: InvoiceUploadFormProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: addDays(new Date().toISOString().slice(0, 10), 30),
      description: '',
      net_amount: 0,
      vat_percent: 24,
      vat_amount: 0,
      total_amount: 0,
      project_id: '',
      notes: '',
    },
  })

  const handleFileSelected = async (files: File[]) => {
    const pdf = files[0]
    if (!pdf) return

    setFile(pdf)
    setIsParsing(true)

    try {
      const formData = new FormData()
      formData.append('file', pdf)

      const response = await fetch('/api/invoices/parse', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Parse failed')
      }

      const parsed: ParsedInvoice = await response.json()
      const issueDate = parsed.date ?? new Date().toISOString().slice(0, 10)

      form.reset({
        issue_date: issueDate,
        due_date: addDays(issueDate, 30),
        description: parsed.description ?? '',
        net_amount: parsed.netAmount ?? 0,
        vat_percent: parsed.vatPercent ?? 24,
        vat_amount: parsed.vatAmount ?? 0,
        total_amount: parsed.totalAmount ?? 0,
        project_id: '',
        notes: '',
        invoice_number: parsed.invoiceNumber ?? '',
        invoice_type: parsed.invoiceType ?? '',
        mark: parsed.mark ?? '',
        issuer_name: parsed.issuerName ?? '',
        issuer_afm: parsed.issuerAfm ?? '',
      })
    } catch (err) {
      console.error('Parse error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to parse invoice')
    } finally {
      setIsParsing(false)
      setStep('review')
      onStepChange?.('review')
    }
  }

  const handleSave = form.handleSubmit(async (values) => {
    if (!file) return
    setIsSaving(true)

    try {
      // 1. Upload PDF to Supabase Storage from browser
      const supabase = createClient()
      const invoiceId = crypto.randomUUID()
      const storagePath = `${clientId}/${invoiceId}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(storagePath, file, { contentType: 'application/pdf' })

      let filePath: string | null = storagePath
      if (uploadError) {
        console.error('Storage upload failed:', uploadError)
        toast.error('PDF upload failed — invoice will be saved without file')
        filePath = null
      }

      // 2. Synthesize line item from parsed amounts
      const lineItem = {
        description: values.description || 'Υπηρεσία',
        quantity: 1,
        unit_price: values.net_amount,
      }

      // 3. Call createInvoice server action
      const result = await createInvoice({
        client_id: clientId,
        project_id: values.project_id || undefined,
        issue_date: values.issue_date,
        due_date: values.due_date || values.issue_date,
        line_items: [lineItem],
        tax_rate: values.vat_percent,
        notes: values.notes || undefined,
        file_path: filePath,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Invoice created')
      onSuccess()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save invoice')
    } finally {
      setIsSaving(false)
    }
  })

  const handleChangeFile = () => {
    setStep('upload')
    setFile(null)
    onStepChange?.('upload')
  }

  // Upload step
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        {isParsing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ανάλυση τιμολογίου...</p>
          </div>
        ) : (
          <FileUploadDropzone
            accept={{ 'application/pdf': ['.pdf'] }}
            maxSize={10 * 1024 * 1024}
            multiple={false}
            onFilesSelected={handleFileSelected}
          />
        )}
      </div>
    )
  }

  // Review step — delegated to InvoiceReviewLayout
  if (!file) return null

  return (
    <InvoiceReviewLayout
      file={file}
      form={form}
      projects={projects}
      isSaving={isSaving}
      onSubmit={handleSave}
      onChangeFile={handleChangeFile}
    />
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/invoices/invoice-upload-form.tsx
git commit -m "feat(invoices): add InvoiceUploadForm with upload + OCR review orchestration"
```

---

## Task 9: Update ClientDrawer — Dynamic Width + InvoiceUploadForm

**Files:**
- Modify: `src/components/admin/clients/client-drawer.tsx`

- [ ] **Step 1: Replace InvoiceForm with InvoiceUploadForm and add dynamic width**

In `src/components/admin/clients/client-drawer.tsx`:

1. Replace import:
```typescript
// Remove:
import { InvoiceForm } from '@/components/admin/invoices/invoice-form';
// Add:
import { InvoiceUploadForm } from '@/components/admin/invoices/invoice-upload-form';
```

2. Add `useState` import and state:
```typescript
import { useState } from 'react';
// Inside function:
const [uploadStep, setUploadStep] = useState<'upload' | 'review'>('upload');
```

3. Replace `onOpenChange` with `handleOpenChange` to reset state:
```typescript
const handleOpenChange = (open: boolean) => {
  if (!open) setUploadStep('upload');
  onOpenChange(open);
};
```

4. **CRITICAL:** Update `handleSuccess` to use `handleOpenChange` too:
```typescript
const handleSuccess = () => {
  handleOpenChange(false);
  onSuccess();
};
```

5. Make SheetContent width dynamic:
```typescript
<SheetContent className={`w-full overflow-y-auto ${
  mode?.type === 'create-invoice' && uploadStep === 'review'
    ? 'sm:max-w-5xl'
    : 'sm:max-w-lg'
}`}>
```

6. Replace InvoiceForm render block with:
```typescript
{mode?.type === 'create-invoice' && (
  <InvoiceUploadForm
    clientId={client.id}
    projects={mode.projects}
    nextInvoiceNumber={mode.nextInvoiceNumber}
    onSuccess={handleSuccess}
    onStepChange={setUploadStep}
  />
)}
```

7. Use `handleOpenChange` in `<Sheet>`:
```typescript
<Sheet open={open} onOpenChange={handleOpenChange}>
```

- [ ] **Step 2: Verify build & commit**

```bash
pnpm build && git add src/components/admin/clients/client-drawer.tsx && git commit -m "feat(invoices): replace InvoiceForm with InvoiceUploadForm in client drawer"
```

---

## Task 10: Update Server Actions — file_path in ALL Selects + Storage Cleanup

**Files:**
- Modify: `src/lib/actions/invoices.ts`

**CRITICAL:** There are 4 select queries in this file that list invoice columns. ALL must include `file_path`.

- [ ] **Step 1: Add `file_path` to ALL select strings**

In `src/lib/actions/invoices.ts`, find every `.select(` call that lists invoice columns. Add `file_path` to each. The field lists appear at approximately:

- `getInvoices` (line ~36): add `file_path` to the column list
- `getInvoice` (line ~78): add `file_path` to the column list
- `createInvoice` (line ~145): add `file_path` to the column list
- `updateInvoice` (line ~201): add `file_path` to the column list

In each case, add `file_path` after `updated_at`:
```
..., updated_at, file_path, client:clients(...
```

- [ ] **Step 2: Update deleteInvoice to clean up Storage**

In `deleteInvoice` (line ~289), add before the `.delete()` call:

```typescript
// Fetch file_path before deleting
const { data: invoice } = await supabase
  .from('invoices')
  .select('file_path')
  .eq('id', id)
  .single()

// Clean up Storage file if exists
if (invoice?.file_path) {
  await supabase.storage.from('invoices').remove([invoice.file_path])
}
```

- [ ] **Step 3: Verify build & commit**

```bash
pnpm build && git add src/lib/actions/invoices.ts && git commit -m "feat(invoices): add file_path to all selects, clean up storage on delete"
```

---

## Task 11: Update ClientInvoicesTab — Download Original PDF

**Files:**
- Modify: `src/components/admin/clients/client-invoices-tab.tsx`

- [ ] **Step 1: Add download original PDF action**

In `src/components/admin/clients/client-invoices-tab.tsx`:

1. Add import at top:
```typescript
import { createClient } from '@/lib/supabase/client'
```

2. In `InvoiceActions` component (line ~204), add handler:
```typescript
const handleDownloadOriginal = async () => {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('invoices')
    .createSignedUrl(invoice.file_path!, 3600)
  if (data?.signedUrl) {
    window.open(data.signedUrl, '_blank')
  }
}
```

3. Add menu item after existing "Download PDF" item:
```typescript
{invoice.file_path && (
  <DropdownMenuItem onClick={handleDownloadOriginal}>
    <FileDown className="mr-2 h-4 w-4" />
    Download Original
  </DropdownMenuItem>
)}
```

- [ ] **Step 2: Verify build & commit**

```bash
pnpm build && git add src/components/admin/clients/client-invoices-tab.tsx && git commit -m "feat(invoices): add download original PDF for uploaded invoices"
```

---

## Task 12: Final Build + Lint + Smoke Test

- [ ] **Step 1: Full build**

```bash
pnpm build
```

- [ ] **Step 2: Lint check**

```bash
pnpm lint
```

- [ ] **Step 3: Type check**

```bash
pnpm type-check
```

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Test at `http://localhost:3000/admin/clients/{id}`:

1. Click "Νέο Τιμολόγιο" → drawer opens with upload dropzone
2. Drop a PDF → loading spinner "Ανάλυση τιμολογίου..."
3. After parsing → drawer widens to max-w-5xl, side-by-side view
4. PDF visible on left (40%), form pre-filled on right (60%)
5. `due_date` defaults to issue_date + 30 days
6. Edit fields, click "Αποθήκευση"
7. Invoice appears in list
8. Dropdown shows "Download Original" → opens PDF in new tab
9. Close drawer → reopen → starts at upload step (not stuck on review)

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix(invoices): address lint and type issues from invoice upload feature"
```
