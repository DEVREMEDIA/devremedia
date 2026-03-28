import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  createNotification,
  createNotificationForMany,
  getClientUserIdFromClientId,
  getAdminUserIds,
} from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await params;

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await request.json();
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Verify Stripe session
    const session = await getStripe().checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 },
      );
    }

    // Verify metadata matches
    if (session.metadata?.invoice_id !== invoiceId) {
      return NextResponse.json({ error: 'Session does not match invoice' }, { status: 400 });
    }

    // Check if already updated (idempotent)
    const adminSupabase = createAdminClient();
    const { data: invoice } = await adminSupabase
      .from('invoices')
      .select('id, status, client_id, invoice_number, total')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ already_paid: true });
    }

    // Update invoice to paid
    const { error: updateError } = await adminSupabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Failed to confirm invoice payment:', updateError);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    // Send notifications
    const amountStr = `€${(invoice.total ?? 0).toFixed(2)}`;

    if (invoice.client_id) {
      const clientUserId = await getClientUserIdFromClientId(invoice.client_id);
      if (clientUserId) {
        createNotification({
          userId: clientUserId,
          type: NOTIFICATION_TYPES.INVOICE_PAID,
          title: `Payment confirmed for invoice ${invoice.invoice_number}`,
          body: `Amount: ${amountStr}`,
          actionUrl: '/client/invoices',
        });
      }
    }

    const adminIds = await getAdminUserIds();
    createNotificationForMany(adminIds, {
      type: NOTIFICATION_TYPES.INVOICE_PAID,
      title: `Invoice ${invoice.invoice_number} paid`,
      body: `Amount: ${amountStr}`,
      actionUrl: '/admin/invoices',
    });

    return NextResponse.json({ confirmed: true });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
