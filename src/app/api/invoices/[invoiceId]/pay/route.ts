import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }
    // 1. Await params (Next.js 16 pattern)
    const { invoiceId } = await params;

    // 2. Get authenticated user via supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Fetch invoice with client and project
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*), project:projects(*)')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 3b. Verify client ownership — only the client who owns this invoice can pay
    const client = invoice.client as { user_id?: string | null } | null;
    if (!client?.user_id || client.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not your invoice' }, { status: 403 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // 4. Build line items for Stripe checkout (line items at net price)
    const currency = invoice.currency?.toLowerCase() || 'eur';
    const lineItems = (
      invoice.line_items as Array<{ description: string; quantity: number; unit_price: number }>
    ).map((item) => ({
      price_data: {
        currency,
        product_data: { name: item.description },
        unit_amount: Math.round(item.unit_price * 100), // cents
      },
      quantity: item.quantity,
    }));

    // 4b. Add VAT as a separate line item if tax exists
    const taxAmount = invoice.tax_amount as number | null;
    if (taxAmount && taxAmount > 0) {
      const taxRate = invoice.tax_rate as number | null;
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: `VAT${taxRate ? ` (${taxRate}%)` : ''}` },
          unit_amount: Math.round(taxAmount * 100),
        },
        quantity: 1,
      });
    }

    // 5. Get app URL from request origin (matches the browser's actual URL)
    const origin =
      request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const appUrl = origin;

    // 6. Create Stripe Checkout session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/client/invoices/${invoiceId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/client/invoices/${invoiceId}/cancel`,
      metadata: { invoice_id: invoiceId },
      customer_email: invoice.client?.email || undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
