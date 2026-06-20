import { describe, it, expect } from 'vitest';
import { proposalPackageSchema } from './proposal';

const BASE = {
  name: 'Pack A',
  shooting_hours: 16,
  editing_hours: 24,
};

describe('proposalPackageSchema — allowance', () => {
  it('accepts an allowance count with unit "days"', () => {
    const result = proposalPackageSchema.safeParse({
      ...BASE,
      allowance_count: 2,
      allowance_unit: 'days',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowance_count).toBe(2);
      expect(result.data.allowance_unit).toBe('days');
    }
  });

  it('accepts an allowance count with unit "slots"', () => {
    const result = proposalPackageSchema.safeParse({
      ...BASE,
      allowance_count: 4,
      allowance_unit: 'slots',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowance_unit).toBe('slots');
    }
  });

  it('rejects an unit other than "days" or "slots"', () => {
    const result = proposalPackageSchema.safeParse({
      ...BASE,
      allowance_count: 4,
      allowance_unit: 'hours',
    });
    expect(result.success).toBe(false);
  });

  it('defaults the unit to "days" when omitted', () => {
    const result = proposalPackageSchema.safeParse({
      ...BASE,
      allowance_count: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowance_unit).toBe('days');
    }
  });

  it('rejects a non-integer allowance count', () => {
    const result = proposalPackageSchema.safeParse({
      ...BASE,
      allowance_count: 2.5,
      allowance_unit: 'days',
    });
    expect(result.success).toBe(false);
  });
});
