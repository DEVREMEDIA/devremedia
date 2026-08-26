import { describe, expect, it } from 'vitest';
import { statusTone, TONE_RULES } from './status-tone';

describe('statusTone', () => {
  it('maps an overdue status to critical', () => {
    expect(statusTone('overdue')).toBe('critical');
  });

  it('maps a pending status to caution', () => {
    expect(statusTone('pending')).toBe('caution');
  });

  it('maps a paid status to positive', () => {
    expect(statusTone('paid')).toBe('positive');
  });

  it('is case and whitespace insensitive', () => {
    expect(statusTone('  PAID  ')).toBe('positive');
  });

  it('matches a multi-word status on its keyword', () => {
    expect(statusTone('payment_overdue')).toBe('critical');
    expect(statusTone('awaiting review')).toBe('caution');
  });

  it('degrades to neutral for a status it has never seen', () => {
    expect(statusTone('flibbertigibbet')).toBe('neutral');
  });

  it('degrades to neutral for empty input', () => {
    expect(statusTone('')).toBe('neutral');
    expect(statusTone(null)).toBe('neutral');
    expect(statusTone(undefined)).toBe('neutral');
  });

  it('is driven by a data table rather than control flow', () => {
    expect(Array.isArray(TONE_RULES)).toBe(true);
    expect(TONE_RULES.length).toBeGreaterThan(0);
    for (const rule of TONE_RULES) {
      expect(Array.isArray(rule.match)).toBe(true);
    }
  });
});
