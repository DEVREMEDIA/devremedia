import { z } from 'zod';

/**
 * A Client's request to book a single date + Time Slot (a Hold).
 * Date and Time Slot are required; location and a short note are optional.
 */
export const bookSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A valid date is required'),
  slot_id: z.string().uuid('A valid time slot is required'),
  location: z.string().trim().max(500, 'Location is too long').optional(),
  note: z.string().trim().max(1000, 'Note is too long').optional(),
});

export type BookSlotInput = z.infer<typeof bookSlotSchema>;
