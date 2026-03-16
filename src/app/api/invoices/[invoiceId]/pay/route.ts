import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
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

    // 4. Build line items for Stripe checkout
    const lineItems = (
      invoice.line_items as Array<{ description: string; quantity: number; unit_price: number }>
    ).map((item) => ({
      price_data: {
        currency: invoice.currency?.toLowerCase() || 'eur',
        product_data: { name: item.description },
        unit_amount: Math.round(item.unit_price * 100), // cents
      },
      quantity: item.quantity,
    }));

    // 5. Get app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 6. Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
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
