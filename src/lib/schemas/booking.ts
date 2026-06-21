import { z } from 'zod';

/** A Client's request to book a (date, start time, duration) window — a Hold. */
export const bookFilmingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A valid date is required'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'A valid start time is required'),
  duration_minutes: z.coerce.number().int().positive('A valid duration is required'),
  location: z.string().trim().max(500, 'Location is too long').optional(),
  note: z.string().trim().max(1000, 'Note is too long').optional(),
});

export type BookFilmingInput = z.infer<typeof bookFilmingSchema>;
