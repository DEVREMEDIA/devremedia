# Invoice Upload with OCR Parsing — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Scope:** Replace manual invoice creation with PDF upload + OCR extraction + editable review

---

## Problem

The current invoice creation flow on the client detail page (`/admin/clients/[id]`) requires manual data entry — no connection to real invoices. The admin wants to upload actual PDF invoices (Greek format), have the system extract the data automatically, verify/edit it, and store both the PDF and the structured data.

## Solution Overview

Replace the manual `InvoiceForm` with an upload-first flow:

1. **Upload** — Admin uploads a PDF invoice via dropzone in the client drawer
2. **Parse** — Next.js API route extracts text via two strategies: first try `pdfjs-dist` text layer extraction (fast, works for digital PDFs); if text layer is empty/insufficient, fall back to tesseract.js WASM OCR (slower, for scanned documents). Then apply regex extraction.
3. **Review** — Side-by-side view: PDF preview (left) + editable form pre-filled with extracted data (right)
4. **Save** — Upload PDF to Supabase Storage from the browser client, then call `createInvoice()` server action with the resulting `file_path` string

## Architecture

### New Components

| Component | Location | Responsibility |
|-----------|----------|---------------|
| `InvoiceUploadForm` | `src/components/admin/invoices/invoice-upload-form.tsx` | Two-step flow: upload → review. Replaces `InvoiceForm` in the client drawer. Drawer widens to `max-w-5xl` when in review step. |
| `InvoiceReviewLayout` | `src/components/admin/invoices/invoice-review-layout.tsx` | Side-by-side layout: PDF viewer (left, 40%) + editable form (right, 60%) |
| `PdfPreview` | `src/components/shared/pdf-preview.tsx` | Embedded PDF viewer using `<iframe>` with blob URL. Fallback: download link for unsupported browsers (mobile Safari). |

### API Route

**`POST /api/invoices/parse`**

- **Input:** `FormData` with `file` field (PDF, max 10MB)
- **Auth:** Requires authenticated user with admin/super_admin role
- **Route config:** `export const maxDuration = 60` (for tesseract.js fallback)
- **Process:**
  1. Receive PDF buffer from FormData
  2. **Strategy 1 — Text layer extraction:** Use `pdfjs-dist` `getTextContent()` API (works in Node.js without canvas). If extracted text has sufficient content (>50 chars), use it directly.
  3. **Strategy 2 — OCR fallback:** If text layer is empty/insufficient (scanned PDF), use tesseract.js WASM with `ell+eng` languages. tesseract.js accepts PDF buffers directly via its `recognize()` method — no image rasterization needed.
  4. Apply regex extraction functions (ported from Python script)
  5. Return structured JSON

- **Output:**
```typescript
interface ParsedInvoice {
  date: string | null           // Converted to YYYY-MM-DD for form compatibility
  invoiceNumber: string | null  // Α.Α.
  invoiceType: string | null    // ΤΠΥ, ΤΔΑ, ΑΠΥ, etc.
  mark: string | null           // ΜΑΡΚ (myDATA)
  issuerName: string | null     // Επωνυμία εκδότη
  issuerAfm: string | null      // ΑΦΜ εκδότη (9 digits)
  customerName: string | null   // Επωνυμία πελάτη
  customerAfm: string | null    // ΑΦΜ πελάτη (9 digits)
  description: string | null    // Περιγραφή υπηρεσίας/προϊόντος
  netAmount: number | null      // Καθαρή αξία
  vatPercent: number | null     // ΦΠΑ %
  vatAmount: number | null      // Ποσό ΦΠΑ
  totalAmount: number | null    // Πληρωτέο
}
```

- **Date handling:** OCR extracts DD/MM/YYYY format. The API route converts to YYYY-MM-DD before returning, matching `createInvoiceSchema.issue_date` format.
- **Error handling:** Returns `{ error: string }` for invalid files, OCR failures, etc.

### Parsing Logic (TypeScript port)

Ported from the user's Python `parse_invoice.py` script into `src/lib/invoice-parser.ts`:

| Function | Extracts |
|----------|----------|
| `parseEuAmount(s)` | EU format amounts: `1.240,00` → `1240.00` |
| `extractDates(text)` | DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY patterns → converts to YYYY-MM-DD |
| `extractAmounts(text)` | Πληρωτέο, Σύνολα row, Συνολ. Αξία, ΦΠΑ%, item rows |
| `extractAfm(text)` | 9-digit numbers after ΑΦΜ/Α.Φ.Μ. |
| `extractInvoiceNumber(text)` | ΤΠΥ/ΤΔΑ/ΑΠΥ type, Α.Α., ΜΑΡΚ |
| `extractNames(text)` | Επωνυμία after Στοιχεία Εκδότη/Πελάτη |
| `extractDescription(text)` | Text between Περιγραφή and Σύνολα |

### Storage

- **Supabase bucket:** `invoices` (new bucket, private)
- **File path pattern:** `{client_id}/{invoice_id}.pdf`
- **Upload mechanism:** Browser uploads directly to Supabase Storage using the authenticated browser client **before** calling `createInvoice()`. Only the resulting `file_path` string is passed to the server action. Server actions cannot receive `File`/`Blob` objects.
- **RLS:** Admins can upload/read all; clients can read their own invoices
- **DB column:** `file_path TEXT` added to `invoices` table (nullable for backward compatibility)
- **Signed URL expiry:** 3600 seconds (1 hour) for client downloads

### Database Migration

**File:** `supabase/migrations/00027_invoice_file_path.sql`

```sql
-- Add file_path column to invoices
ALTER TABLE invoices ADD COLUMN file_path TEXT;

-- Create storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload/read/delete all
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
);

-- Storage RLS: clients read own invoices (LIMIT 1 to prevent multi-row error)
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

### User Flow

```
Admin clicks "Νέο Τιμολόγιο" on client invoices tab
  → Drawer opens with FileUploadDropzone (accepts PDF only, single file)
  → Admin drops/selects PDF
  → Loading spinner: "Ανάλυση τιμολογίου..."
  → POST /api/invoices/parse with PDF
  → Drawer widens to max-w-5xl
  → Side-by-side view appears:
      LEFT (40%): PDF preview via <iframe> with blob URL
      RIGHT (60%): Editable form pre-filled with extracted data
        - Ημερομηνία έκδοσης (date, YYYY-MM-DD)
        - Αρ. Τιμολογίου (text)
        - Τύπος (ΤΠΥ/ΤΔΑ/etc.)
        - ΜΑΡΚ (text)
        - Εκδότης / ΑΦΜ Εκδότη (text, read-only context)
        - Περιγραφή (textarea → maps to line item description)
        - Καθαρή αξία (number)
        - ΦΠΑ % (number, default 24)
        - Ποσό ΦΠΑ (number)
        - Σύνολο πληρωτέο (number)
        - Project (optional dropdown, same as current)
        - Σημειώσεις (textarea, optional)
  → Admin reviews, edits if needed, clicks "Αποθήκευση"
  → Browser uploads PDF to Supabase Storage → gets file_path
  → createInvoice() called with form data + file_path
  → Drawer closes, invoices tab refreshes via existing refreshKey pattern
```

### Line Item Synthesis

The upload flow constructs a single line item from OCR data before calling `createInvoice()`:

```typescript
const lineItem = {
  description: parsed.description ?? 'Υπηρεσία',
  quantity: 1,
  unit_price: parsed.netAmount ?? 0,
}
```

This satisfies the existing `lineItemSchema.min(1)` constraint and the `createInvoice()` server action's `.reduce()` calculation. The `createInvoiceSchema` remains unchanged — no need to make `line_items` optional.

### Client Portal Integration

- Client invoices page shows download button for invoices that have `file_path`
- Download via Supabase Storage signed URL (3600s / 1 hour expiry)
- Existing PDF generation (DMS-branded) remains for invoices without uploaded PDF

### Dependencies

**New npm packages:**
- `tesseract.js` — WASM-based OCR engine (fallback for scanned PDFs)
- `pdfjs-dist` — Text layer extraction from digital PDFs (works in Node.js without canvas)

**No external services required.**

### Type Updates

```typescript
// src/types/entities.ts — add to Invoice interface
file_path: string | null  // Supabase Storage path to uploaded PDF
```

### Schema Updates

```typescript
// src/lib/schemas/invoice.ts — add to createInvoiceSchema
file_path: z.string().nullable().optional()  // Storage path from browser upload
```

`line_items` schema remains unchanged (min 1 required). The `InvoiceUploadForm` constructs the line item array from parsed data before submission.

### Affected Files

| File | Change |
|------|--------|
| `src/components/admin/clients/client-drawer.tsx` | Render `InvoiceUploadForm` instead of `InvoiceForm`. Dynamic drawer width: `max-w-lg` for upload step, `max-w-5xl` for review step. |
| `src/components/admin/clients/client-invoices-tab.tsx` | Add download original PDF button for invoices with `file_path` |
| `src/components/shared/file-upload-dropzone.tsx` | Add optional `multiple` prop (default `true` for backward compat, `false` for invoice upload) |
| `src/lib/actions/invoices.ts` | Accept `file_path` in create input. Update `deleteInvoice` to also remove file from Storage. |
| `src/lib/schemas/invoice.ts` | Add `file_path` field to schema |
| `src/types/entities.ts` | Add `file_path` to Invoice type |
| `src/app/api/invoices/parse/route.ts` | New API route with `maxDuration = 60`. Text-layer-first strategy. |
| `src/lib/invoice-parser.ts` | New — regex extraction functions (ported from Python) |
| `supabase/migrations/00027_invoice_file_path.sql` | New — `file_path` column + storage bucket + RLS policies |

### Performance Considerations

- **Digital PDFs (text layer):** <1 second — `pdfjs-dist` text extraction is near-instant
- **Scanned PDFs (OCR fallback):** ~10-15 seconds per page on first run (tesseract.js downloads language data ~4MB, cached after)
- **Route timeout:** `maxDuration = 60` set on API route
- Max file size: 10MB
- Loading state with progress indicator during parsing

### Error Handling

- Invalid file type → immediate client-side rejection (only PDF accepted, single file)
- OCR failure → show error toast, allow retry or manual fill
- Empty extraction → show form with empty fields, user fills manually
- Storage upload failure → show error toast, invoice data still saved (file_path stays null). Known limitation: no retry mechanism to re-attach PDF later.
- `deleteInvoice` → also removes file from Supabase Storage if `file_path` exists

### Out of Scope

- Multi-page invoice splitting into separate invoices
- Automatic client matching by ΑΦΜ
- Batch upload of multiple invoices
- Training/improving OCR model
- Integration with myDATA/ΑΑΔΕ APIs
- Re-attach PDF flow for failed uploads (future enhancement)
