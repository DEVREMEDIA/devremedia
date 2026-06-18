import { describe, it, expect } from 'vitest';
import { buildInvoiceStatusPayload } from './invoice-status-payload';

describe('buildInvoiceStatusPayload', () => {
  it('includes payment_method when status is paid and paymentMethod is given', () => {
    const payload = buildInvoiceStatusPayload('paid', { paymentMethod: 'bank_transfer' });
    expect(payload.payment_method).toBe('bank_transfer');
    expect(payload.status).toBe('paid');
  });

  it('omits payment_method when status is paid but no paymentMethod given', () => {
    const payload = buildInvoiceStatusPayload('paid', {});
    expect('payment_method' in payload).toBe(false);
  });

  it('omits payment_method when status is sent even if paymentMethod is given', () => {
    const payload = buildInvoiceStatusPayload('sent', { paymentMethod: 'cash' });
    expect('payment_method' in payload).toBe(false);
  });

  it('sets paid_at when status is paid', () => {
    const payload = buildInvoiceStatusPayload('paid', {});
    expect(payload.paid_at).toBeDefined();
  });

  it('sets sent_at when status is sent', () => {
    const payload = buildInvoiceStatusPayload('sent', {});
    expect(payload.sent_at).toBeDefined();
  });

  it('sets only status for other statuses', () => {
    const payload = buildInvoiceStatusPayload('draft', {});
    expect(payload.status).toBe('draft');
    expect('sent_at' in payload).toBe(false);
    expect('paid_at' in payload).toBe(false);
    expect('payment_method' in payload).toBe(false);
  });
});
