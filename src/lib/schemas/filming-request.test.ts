import { describe, it, expect } from 'vitest';
import { publicBookingSchema } from '@/lib/schemas/filming-request';

describe('publicBookingSchema (public contact form)', () => {
  it('accepts a contact-only submission with name, email, phone, company and message', () => {
    const result = publicBookingSchema.safeParse({
      contact_name: 'Jane Doe',
      contact_email: 'jane@example.com',
      contact_phone: '+30 6900000000',
      contact_company: 'Acme',
      description: 'I would like to discuss a video project.',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a minimal submission with only name and email', () => {
    const result = publicBookingSchema.safeParse({
      contact_name: 'Jane Doe',
      contact_email: 'jane@example.com',
    });

    expect(result.success).toBe(true);
  });

  it('requires a valid name and email', () => {
    expect(
      publicBookingSchema.safeParse({ contact_name: '', contact_email: 'jane@example.com' })
        .success,
    ).toBe(false);
    expect(
      publicBookingSchema.safeParse({ contact_name: 'Jane', contact_email: 'not-an-email' })
        .success,
    ).toBe(false);
  });
});
