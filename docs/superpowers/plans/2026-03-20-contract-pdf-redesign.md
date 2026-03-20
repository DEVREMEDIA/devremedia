# Contract PDF Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire contract system with a branded dark/gold PDF template, embedded PDF preview, download→sign→upload flow, and bilingual support.

**Architecture:** Replace the current HTML-based contract content with structured fields (scope_description, special_terms) rendered via react-pdf. Remove digital signature pad in favor of physical sign→upload flow. Embed PDF preview in platform via iframe instead of raw HTML dump.

**Tech Stack:** @react-pdf/renderer, Supabase Storage, Noto Sans font, next-intl (UI) + plain lookup (PDF), Zod validation

**Spec:** `docs/superpowers/specs/2026-03-20-contract-pdf-redesign.md`

---

### Task 1: Database Migration + Infrastructure

**Files:**
- Create: `supabase/migrations/00029_contract_pdf_redesign.sql`
- Modify: `.env.local`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add new columns to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS scope_description text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_terms text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_pdf_path text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'el';

-- Make content column default to empty string for new contracts
ALTER TABLE contracts ALTER COLUMN content SET DEFAULT '';

-- Helper function for contract ownership (used by storage RLS)
CREATE OR REPLACE FUNCTION get_user_contract_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ct.id FROM contracts ct
  JOIN clients c ON c.id = ct.client_id
  WHERE c.user_id = user_uuid;
$$;

-- Create contracts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Clients can upload signed PDFs for their own contracts
CREATE POLICY "Clients upload signed contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM get_user_contract_ids(auth.uid()) cid
      WHERE name LIKE 'signed/' || cid || '/%'
    )
  )
);

-- Clients can view their own signed PDFs
CREATE POLICY "Clients view own signed contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM get_user_contract_ids(auth.uid()) cid
      WHERE name LIKE 'signed/' || cid || '/%'
    )
  )
);

-- Admins can read all contract files
CREATE POLICY "Admins read all contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts'
  AND EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
  )
);
```

- [ ] **Step 2: Add provider env vars to `.env.local`**

```env
PROVIDER_COMPANY_NAME="ΝΤΕΒΡΕΝΤΛΗΣ ΑΓΓΕΛΟΣ ΝΙΚΟΛΑΟΣ"
PROVIDER_VAT_NUMBER="160594763"
PROVIDER_PROFESSION="ΥΠΗΡΕΣΙΕΣ ΦΩΤΟΓΡΑΦΙΣΗΣ ΚΑΙ ΒΙΝΤΕΟΣΚΟΠΗΣΗΣ"
PROVIDER_TAX_OFFICE="ΚΑΛΑΜΑΡΙΑΣ"
PROVIDER_ADDRESS="ΣΟΦΟΥΛΗ ΘΕΜΙΣΤΟΚΛΗ 88, ΚΑΛΑΜΑΡΙΑ"
```

- [ ] **Step 3: Download Noto Sans font files**

```bash
mkdir -p public/fonts
curl -L "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf" -o public/fonts/NotoSans-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Italic%5Bwdth%2Cwght%5D.ttf" -o public/fonts/NotoSans-Bold.ttf
```

Note: If the variable font doesn't work well with react-pdf, download the static `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` from Google Fonts static directory instead. react-pdf works best with static .ttf files.

- [ ] **Step 4: Apply migration locally**

```bash
npx supabase db push
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00029_contract_pdf_redesign.sql public/fonts/
git commit -m "chore(contracts): add migration for PDF redesign + Noto Sans fonts"
```

---

### Task 2: Constants, Types, Schemas

**Files:**
- Modify: `src/lib/constants/enums.ts:64-74`
- Modify: `src/lib/constants/labels.ts:61-68`
- Modify: `src/types/index.ts:166-185`
- Modify: `src/lib/schemas/contract.ts`
- Modify: `src/lib/notification-types.ts:5-6,21-22`

- [ ] **Step 1: Add `pending_review` to CONTRACT_STATUSES**

In `src/lib/constants/enums.ts`, update the array at line 64:

```ts
export const CONTRACT_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'pending_review',
  'signed',
  'expired',
  'cancelled',
] as const;
```

Update `isContractSignable` at line 74 — this function already returns true only for `sent | viewed`, so `pending_review` is already excluded. Verify no change needed.

- [ ] **Step 2: Add status label for `pending_review`**

In `src/lib/constants/labels.ts`, add to `CONTRACT_STATUS_LABELS` at line 61:

```ts
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  pending_review: 'Pending Review',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};
```

- [ ] **Step 3: Update Contract type**

In `src/types/index.ts`, add new fields to the `Contract` type (around line 185). Also update `ContractWithRelations` and `ContractWithProject` types if they explicitly redeclare Contract fields:

```ts
// Add these to the Contract type:
scope_description: string | null;
special_terms: string | null;
signed_pdf_path: string | null;
locale: string;
```

Check `ContractWithRelations` and `ContractWithProject` — if they extend Contract via intersection, the new fields propagate automatically. If they redeclare fields, add the new ones there too.

- [ ] **Step 4: Add notification types**

In `src/lib/notification-types.ts`, add after existing contract types:

```ts
CONTRACT_PENDING_REVIEW: 'contract_pending_review',
CONTRACT_UPLOAD_REJECTED: 'contract_upload_rejected',
```

And in the `TYPE_TO_PREFERENCE` mapping, add:

```ts
contract_pending_review: 'project_updates',
contract_upload_rejected: 'project_updates',
```

- [ ] **Step 5: Update createContractSchema**

In `src/lib/schemas/contract.ts`, add to the schema at lines 8-15:

```ts
export const createContractSchema = z.object({
  project_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  service_type: z.string().min(1),
  agreed_amount: z.coerce.number().positive(),
  payment_method: z.string().min(1),
  expires_at: z.string().optional(),
  scope_description: z.string().optional(),
  special_terms: z.string().optional(),
});
```

Remove `signContractSchema` (lines 58-64) and `SignContractInput` (line 66) — they are no longer needed.

Add `uploadSignedSchema` for the upload endpoint validation:

```ts
export const uploadSignedSchema = z.object({
  file: z.instanceof(File).refine(
    (f) => f.type === 'application/pdf',
    'Only PDF files are accepted',
  ).refine(
    (f) => f.size <= 10 * 1024 * 1024,
    'File too large (max 10 MB)',
  ),
});
```

- [ ] **Step 6: Run build check**

```bash
pnpm build
```

Fix any type errors from the new fields.

- [ ] **Step 7: Commit**

```bash
git add src/lib/constants/ src/types/ src/lib/schemas/contract.ts src/lib/notification-types.ts
git commit -m "feat(contracts): add pending_review status, new fields, notification types"
```

---

### Task 3: PDF Translations + Styles + Template

**Files:**
- Create: `src/lib/pdf/contract-pdf-i18n.ts`
- Modify: `src/lib/pdf/contract-pdf-styles.ts`
- Modify: `src/lib/pdf/contract-template.tsx`

- [ ] **Step 1: Create PDF translations file**

Create `src/lib/pdf/contract-pdf-i18n.ts`:

```ts
export const PDF_TRANSLATIONS = {
  el: {
    serviceAgreement: 'ΣΥΜΒΑΣΗ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ',
    parties: 'ΣΥΜΒΑΛΛΟΜΕΝΑ ΜΕΡΗ',
    provider: 'ΠΑΡΟΧΟΣ ΥΠΗΡΕΣΙΩΝ',
    client: 'ΠΕΛΑΤΗΣ',
    scopeOfServices: 'ΑΝΤΙΚΕΙΜΕΝΟ ΥΠΗΡΕΣΙΩΝ',
    financialTerms: 'ΟΙΚΟΝΟΜΙΚΟΙ ΟΡΟΙ',
    totalAmount: 'ΣΥΝΟΛΙΚΟ ΠΟΣΟ',
    paymentMethod: 'ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ',
    specialTerms: 'ΕΙΔΙΚΟΙ ΟΡΟΙ',
    generalTerms: 'ΓΕΝΙΚΟΙ ΟΡΟΙ',
    signatures: 'ΥΠΟΓΡΑΦΕΣ',
    agreementDate: 'ΗΜΕΡΟΜΗΝΙΑ',
    signatureDeadline: 'ΠΡΟΘΕΣΜΙΑ ΥΠΟΓΡΑΦΗΣ',
    legallyBinding: 'Νομικά δεσμευτικό έγγραφο',
    page: 'Σελ.',
    terms: [
      'Ο πάροχος δεσμεύεται να παραδώσει τις υπηρεσίες εντός του συμφωνημένου χρονοδιαγράμματος.',
      'Η πληρωμή οφείλεται σύμφωνα με τους συμφωνημένους όρους πληρωμής. Καθυστερήσεις πληρωμής μπορεί να επιφέρουν πρόσθετες χρεώσεις.',
      'Αιτήματα αναθεώρησης πρέπει να κοινοποιηθούν εντός 7 ημερών από την τελική παράδοση.',
      'Με την πλήρη εξόφληση, ο Πελάτης λαμβάνει άδεια χρήσης των τελικών παραδοτέων για τον προβλεπόμενο σκοπό. Ο Πάροχος διατηρεί το δικαίωμα χρήσης στο portfolio του εκτός αν συμφωνηθεί διαφορετικά.',
      'Οποιοδήποτε μέρος μπορεί να ακυρώσει με γραπτή ειδοποίηση. Οι προκαταβολές δεν επιστρέφονται εκτός αν συμφωνηθεί διαφορετικά.',
      'Η ευθύνη του Παρόχου περιορίζεται στο συνολικό ποσό που καταβλήθηκε βάσει της παρούσας Σύμβασης.',
      'Η παρούσα Σύμβαση αποτελεί την πλήρη συμφωνία μεταξύ των μερών και αντικαθιστά όλες τις προηγούμενες διαπραγματεύσεις.',
    ],
  },
  en: {
    serviceAgreement: 'SERVICE AGREEMENT',
    parties: 'PARTIES',
    provider: 'SERVICE PROVIDER',
    client: 'CLIENT',
    scopeOfServices: 'SCOPE OF SERVICES',
    financialTerms: 'FINANCIAL TERMS',
    totalAmount: 'TOTAL AMOUNT',
    paymentMethod: 'PAYMENT METHOD',
    specialTerms: 'SPECIAL TERMS',
    generalTerms: 'GENERAL TERMS',
    signatures: 'SIGNATURES',
    agreementDate: 'AGREEMENT DATE',
    signatureDeadline: 'SIGNATURE DEADLINE',
    legallyBinding: 'Legally binding document',
    page: 'Page',
    terms: [
      'The service provider agrees to deliver the services described above within the agreed timeline.',
      'Payment is due according to the agreed payment terms. Late payments may incur additional fees.',
      'Client revision requests must be communicated within 7 days of final delivery.',
      'Upon receipt of full payment, the Client receives a license to use the final deliverables for their intended purpose. Provider retains the right to use the work in their portfolio unless otherwise agreed in writing.',
      'Either party may cancel with written notice. Advance payments are non-refundable unless otherwise agreed.',
      "Provider's liability is limited to the total amount paid under this Agreement.",
      'This Agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, or agreements.',
    ],
  },
} as const;

export type PdfLocale = keyof typeof PDF_TRANSLATIONS;
```

- [ ] **Step 2: Rewrite contract-pdf-styles.ts**

Complete rewrite of `src/lib/pdf/contract-pdf-styles.ts` with:
- New brand palette (#09090b dark, #d4a843 gold, etc.)
- Font.register() for Noto Sans at module scope
- All styles using `fontFamily: 'NotoSans'`
- Remove old `CONTRACT_TERMS` export (replaced by i18n file)

Key palette constants:

```ts
export const C = {
  dark: '#09090b',
  darkCard: '#18181b',
  darkBorder: '#27272a',
  gold: '#d4a843',
  goldDark: '#b8942e',
  white: '#ffffff',
  surface: '#fafafa',
  muted: '#71717a',
  mutedLight: '#a1a1aa',
  text: '#09090b',
  border: '#e4e4e7',
};
```

Styles for: page, header (dark bg), stripe (gold gradient), body (white), dateRow, sectionTitle (gold text), partyCard (left border gold), scopeBox, financialCard (top border gold/dark), termRow (gold numbers), sigBlock, footer (dark bg). All using NotoSans font family.

- [ ] **Step 3: Rewrite contract-template.tsx**

Complete rewrite of `src/lib/pdf/contract-template.tsx` with:

New props interface:

```ts
export interface ContractPDFTemplateProps {
  contract: {
    id: string;
    title: string;
    created_at: string;
    signed_at?: string | null;
    signature_image?: string | null;
    signature_data?: Record<string, unknown> | null;
    status: string;
    service_type?: string | null;
    agreed_amount?: number | null;
    payment_method?: string | null;
    expires_at?: string | null;
    scope_description?: string | null;
    special_terms?: string | null;
  };
  clientName?: string;
  projectTitle?: string;
  locale?: 'el' | 'en';
  logoBase64?: string;
  provider?: {
    companyName: string;
    vatNumber: string;
    taxOffice: string;
    address: string;
  };
}
```

Structure:
1. Dark header with logo Image + service agreement title + contract ref
2. Gold stripe View (2px)
3. Body View with:
   - Date row (agreement date + deadline)
   - Parties section (provider with ΑΦΜ/ΔΟΥ/address + client)
   - Scope section (scope_description || service_type || title fallback, using `||` for truthiness)
   - Financial terms (amount + payment method cards)
   - Special terms section (only if special_terms is non-empty)
   - General terms (from PDF_TRANSLATIONS[locale].terms)
   - Signatures row (`wrap={false}` to prevent page break mid-signatures)
4. Footer with `fixed` prop, using `render` for dynamic page numbers:

```tsx
<View style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
  <>
    <Text style={styles.footerText}>{t.legallyBinding} · {contractRef}</Text>
    <Text style={styles.footerText}>{t.page} {pageNumber}/{totalPages} · devremedia.com</Text>
  </>
)} />
```

Backwards compat: if `signature_image` exists (old signed contracts), still render it in the signatures section.

- [ ] **Step 4: Run build check**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/
git commit -m "feat(contracts): new branded PDF template with dark/gold design + bilingual support"
```

---

### Task 4: PDF API Route Update

**Files:**
- Modify: `src/app/api/contracts/[contractId]/pdf/route.ts`

- [ ] **Step 1: Update the PDF route**

Rewrite `src/app/api/contracts/[contractId]/pdf/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { readFileSync } from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { getContract } from '@/lib/actions/contracts';
import { ContractPDFTemplate } from '@/lib/pdf/contract-template';

// Cache logo as base64 at module level (read once)
const logoPath = path.join(process.cwd(), 'public', 'images', 'LOGO_WhiteLetter.png');
const logoBase64 = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;

const provider = {
  companyName: process.env.PROVIDER_COMPANY_NAME ?? '',
  vatNumber: process.env.PROVIDER_VAT_NUMBER ?? '',
  taxOffice: process.env.PROVIDER_TAX_OFFICE ?? '',
  address: process.env.PROVIDER_ADDRESS ?? '',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractId } = await params;
    const result = await getContract(contractId);

    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error || 'Contract not found' }, { status: 404 });
    }

    const contract = result.data;
    const locale = (contract.locale === 'en' ? 'en' : 'el') as 'el' | 'en';

    // Extract signature_image from signature_data for backwards compat with old signed contracts
    const signatureImage = contract.signature_image ??
      (contract.signature_data as Record<string, unknown> | null)?.['signature_image'] as string | undefined;

    const pdfBuffer = await renderToBuffer(
      <ContractPDFTemplate
        contract={{ ...contract, signature_image: signatureImage ?? null }}
        clientName={contract.client?.contact_name || contract.client?.company_name || undefined}
        projectTitle={contract.project?.title || undefined}
        locale={locale}
        logoBase64={logoBase64}
        provider={provider}
      />,
    );

    // Check for inline preview vs download
    const inline = request.nextUrl.searchParams.get('inline') === 'true';
    const disposition = inline
      ? `inline; filename="contract-${contractId}.pdf"`
      : `attachment; filename="contract-${contractId}.pdf"`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run build check**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contracts/[contractId]/pdf/route.ts
git commit -m "feat(contracts): update PDF route with provider env vars, locale, inline preview"
```

---

### Task 5: Server Actions Update

**Files:**
- Modify: `src/lib/actions/contracts.ts`

- [ ] **Step 1: Remove generateContractContent()**

Delete the function at lines 28-59 of `src/lib/actions/contracts.ts`.

- [ ] **Step 2: Remove signContract()**

Delete the function at lines 344-415.

- [ ] **Step 3: Update createContract()**

In the `createContract()` function (lines 194-298):
- Accept `scope_description` and `special_terms` from validated input
- Set `content: ''` in the insert (not generated HTML)
- Add `locale` field — read from `NEXT_LOCALE` cookie:

```ts
import { cookies } from 'next/headers';
// Inside createContract():
const cookieStore = await cookies();
const locale = cookieStore.get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'el';
```

- Remove the `generateContractContent()` call (lines 237-246)
- Update insert object to include: `scope_description`, `special_terms`, `locale`, `content: ''`

- [ ] **Step 4: Add reviewSignedContract() action**

```ts
export async function reviewSignedContract(
  id: string,
  decision: 'approve' | 'reject',
): Promise<ActionResult<Contract>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Unauthorized' };

  // Admin check
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { data: null, error: 'Forbidden' };
  }

  // Fetch contract
  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('id, status, signed_pdf_path, client_id')
    .eq('id', id)
    .single();

  if (fetchError || !contract) return { data: null, error: 'Contract not found' };
  if (contract.status !== 'pending_review') return { data: null, error: 'Contract is not pending review' };

  if (decision === 'approve') {
    if (!contract.signed_pdf_path) return { data: null, error: 'No signed PDF uploaded' };

    const { data, error } = await supabase
      .from('contracts')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('id', id)
      .select(/* all columns */)
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath('/admin/contracts');
    revalidatePath(`/admin/contracts/${id}`);
    revalidatePath('/client/contracts');
    return { data, error: null };
  }

  // Reject — set back to sent
  const { data, error } = await supabase
    .from('contracts')
    .update({ status: 'sent' })
    .eq('id', id)
    .select(/* all columns */)
    .single();

  if (error) return { data: null, error: error.message };

  // Notify client
  const clientUserId = await getClientUserIdFromClientId(contract.client_id);
  if (clientUserId) {
    await createNotification({
      userId: clientUserId,
      type: NOTIFICATION_TYPES.CONTRACT_UPLOAD_REJECTED,
      title: 'Contract needs re-signing',
      actionUrl: `/client/contracts/${id}`,
    });
  }

  revalidatePath('/admin/contracts');
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath('/client/contracts');
  return { data, error: null };
}
```

- [ ] **Step 5: Update all .select() column lists**

Every `.select()` call in contracts.ts must include the 4 new columns. Find all occurrences (lines ~72, 97, 120, 149, 184, 264, 324, 384) and add: `scope_description, special_terms, signed_pdf_path, locale`.

For the calls that use wildcard (`'*'` or `'*, ...'`), the new columns are automatically included.

- [ ] **Step 6: Run build check**

```bash
pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/contracts.ts
git commit -m "feat(contracts): update actions — new fields, reviewSignedContract, remove sign flow"
```

---

### Task 6: Upload Signed PDF API Route

**Files:**
- Create: `src/app/api/contracts/[contractId]/upload-signed/route.ts`

- [ ] **Step 1: Create the upload endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';
import { createNotificationForMany } from '@/lib/actions/notifications';
import { getAdminUserIds } from '@/lib/actions/notifications';
import { revalidatePath } from 'next/cache';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractId } = await params;

    // 2. Get contract and verify ownership
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, client_id, clients!inner(user_id)')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Ownership check
    const clientUserId = (contract as any).clients?.user_id;
    if (clientUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Status guard
    if (!['sent', 'viewed'].includes(contract.status)) {
      return NextResponse.json(
        { error: 'Contract cannot accept uploads in current status' },
        { status: 400 },
      );
    }

    // 4. Read and validate file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    // Magic bytes check
    const buffer = await file.arrayBuffer();
    const header = new Uint8Array(buffer.slice(0, 5));
    const isPdf = PDF_MAGIC_BYTES.every((byte, i) => header[i] === byte);
    if (!isPdf) {
      return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 });
    }

    // 5. Upload to Supabase Storage (server-side path construction)
    const storagePath = `signed/${contractId}/signed-contract.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true, // Allow re-upload
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // 6. Update contract
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        signed_pdf_path: storagePath,
        status: 'pending_review',
      })
      .eq('id', contractId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
    }

    // 7. Notify admins
    const adminIds = await getAdminUserIds();
    if (adminIds.length > 0) {
      await createNotificationForMany(adminIds, {
        type: NOTIFICATION_TYPES.CONTRACT_PENDING_REVIEW,
        title: 'Signed contract uploaded',
        actionUrl: `/admin/contracts/${contractId}`,
      });
    }

    revalidatePath('/admin/contracts');
    revalidatePath(`/admin/contracts/${contractId}`);
    revalidatePath('/client/contracts');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

Note: Check how `getAdminUserIds` and `createNotificationForMany` are exported from `src/lib/actions/notifications.ts`. Adjust imports if they are not directly exported (they may need to be extracted or the notification call done inline).

- [ ] **Step 2: Run build check**

```bash
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contracts/[contractId]/upload-signed/
git commit -m "feat(contracts): add signed PDF upload endpoint with validation"
```

---

### Task 7: Contract Creator Form Update

**Files:**
- Modify: `src/components/admin/contracts/contract-creator.tsx:283-401`

- [ ] **Step 1: Add scope_description and special_terms textareas**

In `src/components/admin/contracts/contract-creator.tsx`, add two new fields to the form section (after the service_type field, around line 347):

1. **Scope Description textarea** — between service_type and amount fields:

```tsx
<div className="space-y-2">
  <Label htmlFor="scope_description">{t('scopeDescription')}</Label>
  <Textarea
    id="scope_description"
    {...register('scope_description')}
    placeholder={t('scopeDescriptionPlaceholder')}
    rows={4}
  />
  {errors.scope_description && (
    <p className="text-sm text-red-500">{errors.scope_description.message}</p>
  )}
</div>
```

2. **Special Terms textarea** — after payment method, before deadline:

```tsx
<div className="space-y-2">
  <Label htmlFor="special_terms">{t('specialTerms')}</Label>
  <Textarea
    id="special_terms"
    {...register('special_terms')}
    placeholder={t('specialTermsPlaceholder')}
    rows={4}
  />
  {errors.special_terms && (
    <p className="text-sm text-red-500">{errors.special_terms.message}</p>
  )}
</div>
```

Also update the preview section (lines 140-254) to show scope_description and special_terms instead of the old HTML content preview.

- [ ] **Step 2: Add translations**

Add to `messages/el.json` under `contracts`:
```json
"scopeDescription": "Περιγραφή Υπηρεσιών",
"scopeDescriptionPlaceholder": "Αναλυτική περιγραφή των υπηρεσιών που θα παρασχεθούν...",
"specialTerms": "Ειδικοί Όροι",
"specialTermsPlaceholder": "Ειδικοί όροι για αυτή τη σύμβαση..."
```

Add equivalent to `messages/en.json`.

- [ ] **Step 3: Run build check**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/contracts/contract-creator.tsx messages/
git commit -m "feat(contracts): add scope description and special terms to contract form"
```

---

### Task 8: Remove Old Sign Flow + All View Updates (atomic)

> **IMPORTANT:** This task modifies ContractView (removes `showSignature` prop) AND all its consumers simultaneously. All changes must be done together before running build.

**Files:**
- Modify: `src/components/shared/contract-view.tsx` (complete rewrite)
- Modify: `src/app/admin/contracts/[contractId]/contract-view-page.tsx`
- Modify: `src/app/client/contracts/[contractId]/contract-view-client.tsx`
- Modify: `src/app/client/contracts/[contractId]/page.tsx`
- Delete: `src/app/client/contracts/[contractId]/sign/page.tsx`
- Delete: `src/app/client/contracts/[contractId]/sign/sign-client.tsx`
- Delete: `src/app/api/contracts/[contractId]/sign/route.ts`
- Delete: `src/components/shared/signature-pad.tsx`

- [ ] **Step 1: Delete old sign flow files**

```bash
rm -rf src/app/client/contracts/\[contractId\]/sign/
rm src/app/api/contracts/\[contractId\]/sign/route.ts
rm src/components/shared/signature-pad.tsx
```

- [ ] **Step 2: Rewrite ContractView with embedded PDF**

Replace the entire `src/components/shared/contract-view.tsx` with an iframe-based PDF preview + metadata cards:

```tsx
'use client';

import { format } from 'date-fns';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface Contract {
  id: string;
  title: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
  agreed_amount?: number | null;
  payment_method?: string | null;
  client?: { contact_name?: string; company_name?: string } | null;
}

interface ContractViewProps {
  contract: Contract;
}

export function ContractView({ contract }: ContractViewProps) {
  const t = useTranslations('contracts');

  return (
    <div className="space-y-4">
      {/* PDF Preview */}
      <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: '70vh' }}>
        <iframe
          src={`/api/contracts/${contract.id}/pdf?inline=true`}
          className="w-full h-full border-0"
          title={contract.title}
        />
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('status')}</p>
            <div className="mt-1"><StatusBadge status={contract.status} /></div>
          </CardContent>
        </Card>
        {contract.client && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('client')}</p>
              <p className="mt-1 font-semibold text-sm">
                {contract.client.contact_name || contract.client.company_name}
              </p>
            </CardContent>
          </Card>
        )}
        {contract.agreed_amount != null && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('amount')}</p>
              <p className="mt-1 font-semibold text-sm">€{contract.agreed_amount.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
        {contract.expires_at && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('deadline')}</p>
              <p className="mt-1 font-semibold text-sm">
                {format(new Date(contract.expires_at), 'dd/MM/yyyy')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

No more `showSignature` prop — signature is in the PDF itself.

- [ ] **Step 3: Update admin contract view page**

In `src/app/admin/contracts/[contractId]/contract-view-page.tsx`:

1. Download PDF button — show for ALL statuses (remove `contract.status === 'signed'` condition at line 92)
2. Remove `showSignature` prop from `<ContractView>` (line 117)
3. Pass full contract to ContractView (needs `client`, `agreed_amount`, etc.)
4. Add approve/reject buttons for `pending_review` status:

```tsx
{contract.status === 'pending_review' && (
  <>
    <Button size="sm" onClick={handleApprove} disabled={isApproving}>
      <Check className="h-4 w-4 mr-2" />
      {isApproving ? t('approving') : t('approveContract')}
    </Button>
    <Button size="sm" variant="outline" onClick={handleReject} disabled={isRejecting}>
      <X className="h-4 w-4 mr-2" />
      {isRejecting ? t('rejecting') : t('rejectContract')}
    </Button>
  </>
)}
```

5. Add handlers:

```tsx
const handleApprove = async () => {
  setIsApproving(true);
  const result = await reviewSignedContract(contract.id, 'approve');
  if (result.error) { toast.error(result.error); setIsApproving(false); return; }
  toast.success(t('contractApproved'));
  router.refresh();
  setIsApproving(false);
};

const handleReject = async () => {
  setIsRejecting(true);
  const result = await reviewSignedContract(contract.id, 'reject');
  if (result.error) { toast.error(result.error); setIsRejecting(false); return; }
  toast.success(t('contractRejected'));
  router.refresh();
  setIsRejecting(false);
};
```

- [ ] **Step 4: Update client contract view page**

In `src/app/client/contracts/[contractId]/page.tsx`:
- Remove the redirect to sign page (lines 31-32). Client should always see the contract view.

- [ ] **Step 5: Update ContractViewClient**

Rewrite `src/app/client/contracts/[contractId]/contract-view-client.tsx`:

1. Remove `showSignature` prop from `<ContractView>`
2. Keep Download PDF button (for `sent`, `viewed`, `signed`, `pending_review`)
3. Add Upload Signed PDF button (only for `sent`, `viewed`):

```tsx
const fileRef = useRef<HTMLInputElement>(null);
const [isUploading, setIsUploading] = useState(false);

const handleUpload = async () => {
  if (!fileRef.current?.files?.[0]) return;
  setIsUploading(true);

  const formData = new FormData();
  formData.append('file', fileRef.current.files[0]);

  try {
    const response = await fetch(`/api/contracts/${contract.id}/upload-signed`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Upload failed');
    }

    toast.success(t('uploadSuccess'));
    router.refresh();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('uploadFailed'));
  } finally {
    setIsUploading(false);
  }
};
```

JSX:
```tsx
<input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
{['sent', 'viewed'].includes(contract.status) && (
  <Button onClick={() => fileRef.current?.click()} disabled={isUploading}>
    <Upload className="h-4 w-4 mr-2" />
    {isUploading ? t('uploading') : t('uploadSigned')}
  </Button>
)}
{contract.status === 'pending_review' && (
  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center text-sm">
    {t('pendingReviewMessage')}
  </div>
)}
```

- [ ] **Step 6: Add all translations**

Add to `messages/el.json` under `contracts`:
```json
"status": "Κατάσταση",
"client": "Πελάτης",
"amount": "Ποσό",
"deadline": "Προθεσμία",
"approveContract": "Έγκριση",
"rejectContract": "Απόρριψη",
"approving": "Έγκριση...",
"rejecting": "Απόρριψη...",
"contractApproved": "Το συμβόλαιο εγκρίθηκε",
"contractRejected": "Το συμβόλαιο απορρίφθηκε - ο πελάτης ειδοποιήθηκε",
"uploadSigned": "Ανέβασμα Υπογεγραμμένου",
"uploading": "Ανεβαίνει...",
"uploadSuccess": "Το υπογεγραμμένο συμβόλαιο ανέβηκε επιτυχώς",
"uploadFailed": "Αποτυχία ανεβάσματος",
"pendingReviewMessage": "Το υπογεγραμμένο συμβόλαιο σας ελέγχεται. Θα ειδοποιηθείτε μόλις εγκριθεί."
```

Add equivalent to `messages/en.json`.

- [ ] **Step 7: Search for broken imports**

```bash
grep -r "signature-pad\|sign-client\|SignaturePad\|signContract\|showSignature" src/ --include="*.ts" --include="*.tsx"
```

Fix any remaining references.

- [ ] **Step 8: Run build check**

```bash
pnpm build
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(contracts): embedded PDF preview, upload flow, approve/reject, remove sign flow"
```

---

### Task 9: Final Build Verification + Translations Cleanup

**Files:**
- Modify: `messages/el.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Verify all translation keys exist**

Search for any `t('...')` calls in contract components and verify every key exists in both `messages/el.json` and `messages/en.json`.

- [ ] **Step 2: Full build check**

```bash
pnpm build
```

- [ ] **Step 3: Manual test checklist**

Run `pnpm dev` and verify:
1. Admin can create a contract with scope_description + special_terms
2. PDF generates with dark/gold design, logo, Greek text, provider details
3. PDF preview shows inline in admin contract view
4. PDF preview shows inline in client contract view
5. Client can download PDF
6. Client can upload signed PDF
7. Contract status changes to `pending_review`
8. Admin sees approve/reject buttons
9. Admin approve → status becomes `signed`
10. Admin reject → status back to `sent`, client notified
11. Multi-page contracts don't break mid-section

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(contracts): complete contract PDF redesign — branded template, upload flow, bilingual"
```
