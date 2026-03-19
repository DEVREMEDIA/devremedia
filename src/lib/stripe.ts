import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return _stripe;
}

/**
 * Get Stripe payment URL for an invoice
 * @param invoiceId - The invoice ID
 * @returns Payment URL pointing to the invoice payment API route
 */
export function getStripePaymentUrl(invoiceId: string): string {
  return `/api/invoices/${invoiceId}/pay`;
}
