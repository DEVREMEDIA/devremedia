import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { ParsedInvoice } from '@/lib/invoice-parser';

export const maxDuration = 60;

const parsedInvoiceSchema = z.object({
  date: z.string().nullable().describe('Invoice date in YYYY-MM-DD format'),
  invoiceNumber: z.string().nullable().describe('Invoice number (Α.Α.)'),
  invoiceType: z.string().nullable().describe('Invoice type: ΤΠΥ, ΤΔΑ, ΑΠΥ, etc.'),
  mark: z.string().nullable().describe('ΜΑΡΚ number from myDATA (long digit sequence)'),
  issuerName: z.string().nullable().describe('Issuer company name (Επωνυμία εκδότη)'),
  issuerAfm: z.string().nullable().describe('Issuer tax ID (ΑΦΜ εκδότη, 9 digits)'),
  customerName: z.string().nullable().describe('Customer company name (Επωνυμία πελάτη)'),
  customerAfm: z.string().nullable().describe('Customer tax ID (ΑΦΜ πελάτη, 9 digits)'),
  description: z.string().nullable().describe('Service/product description'),
  netAmount: z.number().nullable().describe('Net amount before VAT (Καθαρή αξία)'),
  vatPercent: z.number().nullable().describe('VAT percentage (e.g. 24)'),
  vatAmount: z.number().nullable().describe('VAT amount (Ποσό ΦΠΑ)'),
  totalAmount: z.number().nullable().describe('Total payable amount (Πληρωτέο)'),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ParsedInvoice | { error: string }>> {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { image } = body as { image: string };

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Call GPT-4o-mini with vision to extract invoice data
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: parsedInvoiceSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract all invoice data from this Greek invoice image.
This is a Greek tax invoice (τιμολόγιο). Extract:
- Date (ημερομηνία) in YYYY-MM-DD format
- Invoice number (Α.Α.) and type (ΤΠΥ/ΤΔΑ/ΑΠΥ)
- ΜΑΡΚ number (long digit sequence from myDATA)
- Issuer name and AFM (ΑΦΜ, 9 digits)
- Customer name and AFM
- Description of services/products
- Net amount (Καθαρή αξία), VAT % and amount, Total (Πληρωτέο)
Return null for any field you cannot find.`,
            },
            {
              type: 'image',
              image: Buffer.from(image, 'base64'),
            },
          ],
        },
      ],
    });

    return NextResponse.json(object as ParsedInvoice);
  } catch (err: unknown) {
    console.error('Invoice parse error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse invoice' },
      { status: 500 },
    );
  }
}
