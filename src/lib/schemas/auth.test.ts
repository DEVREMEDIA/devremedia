import { describe, it, expect } from 'vitest';
import { confirmationSchema } from './auth';

describe('confirmationSchema', () => {
  it('accepts matching passwords of valid length', () => {
    const result = confirmationSchema.safeParse({
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 6 characters', () => {
    const result = confirmationSchema.safeParse({ password: 'abc', confirmPassword: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects a password longer than 128 characters', () => {
    const tooLong = 'a'.repeat(129);
    const result = confirmationSchema.safeParse({
      password: tooLong,
      confirmPassword: tooLong,
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords and points the error at confirmPassword', () => {
    const result = confirmationSchema.safeParse({
      password: 'secret123',
      confirmPassword: 'secret124',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('confirmPassword');
    }
  });
});
