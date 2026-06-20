import { describe, it, expect } from 'vitest';
import { clientAgreementSchema } from './client-agreement';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const PACKAGE_ID = '22222222-2222-4222-8222-222222222222';

const BASE = {
  client_id: CLIENT_ID,
  package_id: PACKAGE_ID,
  agreed_monthly_price: 1170,
};

describe('clientAgreementSchema', () => {
  it('accepts a valid agreement', () => {
    const result = clientAgreementSchema.safeParse(BASE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.client_id).toBe(CLIENT_ID);
      expect(result.data.package_id).toBe(PACKAGE_ID);
      expect(result.data.agreed_monthly_price).toBe(1170);
      expect(result.data.active).toBe(true);
    }
  });

  it('coerces a numeric string price from a form input', () => {
    const result = clientAgreementSchema.safeParse({ ...BASE, agreed_monthly_price: '1360.50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agreed_monthly_price).toBe(1360.5);
    }
  });

  it('rejects a non-uuid client_id', () => {
    const result = clientAgreementSchema.safeParse({ ...BASE, client_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid package_id', () => {
    const result = clientAgreementSchema.safeParse({ ...BASE, package_id: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative price', () => {
    const result = clientAgreementSchema.safeParse({ ...BASE, agreed_monthly_price: -1 });
    expect(result.success).toBe(false);
  });

  it.each(['abc', '', null, undefined])('rejects an invalid price %p', (bad) => {
    const result = clientAgreementSchema.safeParse({ ...BASE, agreed_monthly_price: bad });
    expect(result.success).toBe(false);
  });
});
