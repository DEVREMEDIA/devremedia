import { describe, it, expect } from 'vitest';
import { countBulkOutcome } from './bulk-result';

describe('countBulkOutcome', () => {
  it('counts all as succeeded when every requested id was affected', () => {
    expect(countBulkOutcome(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual({
      succeeded: 3,
      failed: 0,
    });
  });

  it('counts the unaffected ids as failed', () => {
    expect(countBulkOutcome(['a', 'b', 'c'], ['a'])).toEqual({
      succeeded: 1,
      failed: 2,
    });
  });

  it('handles an empty affected set as all failed', () => {
    expect(countBulkOutcome(['a', 'b'], [])).toEqual({ succeeded: 0, failed: 2 });
  });

  it('handles an empty request as zero of each', () => {
    expect(countBulkOutcome([], [])).toEqual({ succeeded: 0, failed: 0 });
  });
});
