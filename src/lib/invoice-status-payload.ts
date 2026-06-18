export function buildInvoiceStatusPayload(
  status: string,
  opts: { paymentMethod?: string },
): Record<string, unknown> {
  const payload: Record<string, unknown> = { status };
  if (status === 'sent') {
    payload.sent_at = new Date().toISOString();
  }
  if (status === 'paid') {
    payload.paid_at = new Date().toISOString();
    if (opts.paymentMethod) {
      payload.payment_method = opts.paymentMethod;
    }
  }
  return payload;
}
