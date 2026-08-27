import { describe, expect, it } from 'vitest';
import { resolveStatusLabel } from './status-badge';
import { statusTone } from '@/lib/status-tone';
import el from '../../../messages/el.json';
import en from '../../../messages/en.json';

describe('resolveStatusLabel', () => {
  it('resolves a known status to its Greek label', () => {
    expect(resolveStatusLabel('in_progress', el.statuses)).toBe('Σε Εξέλιξη');
  });

  it('resolves the same known status to its English label', () => {
    expect(resolveStatusLabel('in_progress', en.statuses)).toBe('In Progress');
  });

  it('resolves a status across namespaces, not just the first one checked', () => {
    // "signed" only exists under contractStatus, not the first namespace in the file.
    expect(resolveStatusLabel('signed', el.statuses)).toBe('Υπογεγραμμένο');
  });

  it('normalizes spaced input the same way the tone resolver does', () => {
    expect(resolveStatusLabel('in progress', el.statuses)).toBe(
      resolveStatusLabel('in_progress', el.statuses),
    );
  });

  it('falls back to prettified text for a status no namespace has ever seen', () => {
    expect(resolveStatusLabel('flibbertigibbet', el.statuses)).toBe('Flibbertigibbet');
    expect(resolveStatusLabel('needs_review_urgently', en.statuses)).toBe('Needs Review Urgently');
  });

  it('never throws for an unknown status, and still resolves a tone for it', () => {
    expect(() => resolveStatusLabel('brand_new_status', el.statuses)).not.toThrow();
    expect(resolveStatusLabel('brand_new_status', el.statuses)).toBe('Brand New Status');
    // The tone resolver runs on the raw value independently of the label lookup —
    // an admin-added status still gets a sensible (here: neutral) tone, never a crash.
    expect(statusTone('brand_new_status')).toBe('neutral');
  });

  it('falls back gracefully when the catalogue itself is missing', () => {
    expect(resolveStatusLabel('overdue', undefined)).toBe('Overdue');
  });

  it('keeps the tone intact across the label fix for a status that must stay colored', () => {
    // "overdue" must render red (critical) whether the label ends up translated
    // or falls back to prettified text — the label lookup must never change the tone.
    const normalizedStatus = 'overdue';
    expect(statusTone(normalizedStatus)).toBe('critical');
    expect(resolveStatusLabel(normalizedStatus, el.statuses)).toBe('Ληξιπρόθεσμο');
    expect(resolveStatusLabel(normalizedStatus, en.statuses)).toBe('Overdue');
  });

  it('keeps a positive-toned status positive after the label fix', () => {
    const normalizedStatus = 'paid';
    expect(statusTone(normalizedStatus)).toBe('positive');
    expect(resolveStatusLabel(normalizedStatus, el.statuses)).toBe('Πληρωμένο');
  });
});
