# Clients pay Invoices via bank (RF / IBAN); the DMS shows instructions, it does not process card payments

A Client (Angelos) asked to **remove card payment** from Invoices and instead show
the **RF Payment Code** «ιδανικά να εμφανίζεται RF», falling back to the company **Bank
Details** if there is no RF. We adopt the stance that the DMS **displays payment
instructions** and never moves money: the client invoice page stops offering Stripe card
checkout and instead shows the Invoice's RF Payment Code when present, otherwise the
company's beneficiary / IBAN / bank name. The Stripe code path is left in the tree but
**unreferenced** (reversible), not deleted.

## Context

Until now a Client paid an Invoice **by card**: the client invoice detail page
(`src/components/client/invoices/invoice-detail.tsx`) had a "Pay Now" button that called
`/api/invoices/[invoiceId]/pay`, which created a Stripe Checkout session
(`payment_method_types: ['card']`). A Stripe webhook then marked the Invoice `paid`.

Two realities make card checkout the wrong fit here:

1. **Greek payment practice.** Businesses collect via bank transfer, and increasingly via
   the **RF creditor reference** (ISO 11649, prefixed `RF`) entered in the payer's
   e-banking, so the bank/accountant automatically reconciles which Invoice was paid.
   Card processing adds fees and an extra rail nobody asked for.
2. **Invoices are uploaded, not generated.** The admin uploads the real Invoice PDF (cut
   in their accounting software / myDATA); the app OCR-parses metadata and stores the
   original file (`file_path`). There is no app-generated Invoice PDF, so the RF/IBAN
   typically **already lives on the uploaded PDF** — the gap is only the *digital* page.

The word "remove" is the trap: it could mean (a) hide the client-facing card button,
(b) rip out Stripe entirely, or (c) keep card and merely add bank info. We confirmed the
intent with Angelos: remove the client's card option and replace it with RF/bank
**instructions** on the digital invoice page.

## Decision

- **Stop processing payments in-app.** Remove the client "Pay Now" card button and the
  `handlePayment` Stripe call from the client invoice page. The DMS only *shows how to pay*.
- **Hide Stripe, don't delete it.** The `/api/invoices/[id]/pay` route, the Stripe webhook,
  the success/cancel pages, `stripe.ts`, and the Stripe settings tab stay in place,
  unreferenced. This keeps the change reversible and avoids touching the webhook that also
  marks Invoices `paid`.
- **RF Payment Code is optional, per Invoice.** New nullable `invoices.rf_code` (text). The
  company does not generate it — an admin pastes the bank/accounting RF. Entered/edited
  from the **admin invoice detail page** (covers existing Invoices too); not added to the
  upload+review form or auto-extracted by OCR.
- **Bank Details are one company-wide set.** Beneficiary, IBAN, bank name — kept with
  company settings, edited in admin Settings.
- **Display rule on the client page:** if the Invoice has an RF → show RF as the primary
  method with the Bank Details below as an alternative; if no RF → show only Bank Details;
  if neither RF nor Bank Details exist → show "contact the company for payment details".
- **PDF and Email are out of scope.** We do not overlay RF/IBAN onto the uploaded PDF
  (it is the user's own document and likely already contains it), and we do not add it to
  the invoice email for now.

## Consequences

- A future reader who finds Stripe fully wired (checkout route, webhook, settings tab) but
  unused from the UI should read this ADR before "fixing" it: card checkout was
  **deliberately unreferenced**, not forgotten. Re-enabling card = re-adding one button.
- The **Client must be able to read Bank Details**, but `getCompanySettings` is admin-only.
  A narrow, client-readable accessor must return **only** the three bank fields (no other
  settings). The IBAN is non-sensitive — it is already printed on Invoices.
- Admin copy that referenced a "payment link" ("Send payment link") no longer matches
  reality and should be reworded (e.g. "Mark as sent").
- RF/IBAN reconciliation stays a **manual / accounting** concern. The DMS does not learn
  when an RF payment lands; an admin still records the Invoice as `paid` as today.
- Glossary terms added to `CONTEXT.md`: RF Payment Code, Bank Details, and a sharpened
  definition of "Pay" (a Client pays via their bank; the app does not move money).
