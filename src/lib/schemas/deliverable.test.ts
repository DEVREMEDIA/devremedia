import { describe, it, expect } from 'vitest';
import { createAnnotationSchema } from './deliverable';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('createAnnotationSchema', () => {
  it('accepts a timestamped annotation', () => {
    const result = createAnnotationSchema.safeParse({
      deliverable_id: VALID_UUID,
      timestamp_seconds: 42.5,
      content: 'Fix the intro cut',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a general annotation without timestamp_seconds', () => {
    const result = createAnnotationSchema.safeParse({
      deliverable_id: VALID_UUID,
      content: 'Change the intro music',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timestamp_seconds).toBeNull();
    }
  });

  it('accepts a general annotation with explicit null timestamp', () => {
    const result = createAnnotationSchema.safeParse({
      deliverable_id: VALID_UUID,
      timestamp_seconds: null,
      content: 'Rework the color grading',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timestamp_seconds).toBeNull();
    }
  });

  it('rejects when content is empty', () => {
    const result = createAnnotationSchema.safeParse({
      deliverable_id: VALID_UUID,
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative timestamp', () => {
    const result = createAnnotationSchema.safeParse({
      deliverable_id: VALID_UUID,
      timestamp_seconds: -1,
      content: 'Fix something',
    });
    expect(result.success).toBe(false);
  });
});
