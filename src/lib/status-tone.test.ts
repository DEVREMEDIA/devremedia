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

  it('maps a declined status to critical', () => {
    expect(statusTone('declined')).toBe('critical');
  });

  it('maps a revision_requested status to caution', () => {
    expect(statusTone('revision_requested')).toBe('caution');
  });

  it('maps a revisions status to caution', () => {
    expect(statusTone('revisions')).toBe('caution');
  });

  it('maps a reviewed status to caution', () => {
    expect(statusTone('reviewed')).toBe('caution');
  });

  it('maps an accepted status to positive', () => {
    expect(statusTone('accepted')).toBe('positive');
  });

  it('maps a converted status to positive', () => {
    expect(statusTone('converted')).toBe('positive');
  });

  it('maps a final status to positive', () => {
    expect(statusTone('final')).toBe('positive');
  });

  it('maps a published status to positive', () => {
    expect(statusTone('published')).toBe('positive');
  });

  it('maps an urgent priority to critical, matching StatusBadge', () => {
    expect(statusTone('urgent')).toBe('critical');
  });

  it('maps a high priority to caution, matching StatusBadge', () => {
    expect(statusTone('high')).toBe('caution');
  });

  it('keeps revision_requested on caution, a deliberate divergence from StatusBadge', () => {
    expect(statusTone('revision_requested')).toBe('caution');
  });

  it('leaves progress-stage and inert statuses neutral on purpose', () => {
    const deliberatelyNeutral = [
      'archived',
      'briefing',
      'pre_production',
      'filming',
      'editing',
      'todo',
      'lead',
      'inactive',
    ];
    for (const status of deliberatelyNeutral) {
      expect(statusTone(status)).toBe('neutral');
    }
  });
});
