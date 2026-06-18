import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createNotification,
  createNotificationForMany,
  getClientUserIdFromClientId,
  getAdminUserIds,
} from '@/lib/actions/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notification-types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Webhook error: Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoice_id;

        if (!invoiceId) {
          console.error('Webhook error: Missing invoice_id in session metadata');
          return NextResponse.json({ error: 'Missing invoice_id in metadata' }, { status: 400 });
        }

        // Use admin client to bypass RLS for system operation
        const supabase = createAdminClient();

        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'card',
          })
          .eq('id', invoiceId);

        if (updateError) {
          console.error('Failed to update invoice:', updateError);
          return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
        }

        console.log(`Invoice ${invoiceId} marked as paid`);

        // Create notifications for payment confirmation
        const { data: invoice } = await supabase
          .from('invoices')
          .select('invoice_number, client_id, total')
          .eq('id', invoiceId)
          .single();

        if (invoice) {
          const amountStr = `€${(invoice.total ?? 0).toFixed(2)}`;

          // Notify client
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

          // Notify admins
          const adminIds = await getAdminUserIds();
          createNotificationForMany(adminIds, {
            type: NOTIFICATION_TYPES.INVOICE_PAID,
            title: `Invoice ${invoice.invoice_number} paid`,
            body: `Amount: ${amountStr}`,
            actionUrl: '/admin/invoices',
          });
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
