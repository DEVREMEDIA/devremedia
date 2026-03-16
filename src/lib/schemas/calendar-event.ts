import { z } from 'zod';
import { CALENDAR_EVENT_TYPES } from '@/lib/constants';

export const createCalendarEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(2000).optional().nullable(),
    start_date: z
      .string()
      .min(1, 'Start date is required')
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, 'Invalid date format'),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, 'Invalid date format')
      .optional()
      .nullable(),
    all_day: z.boolean().default(true),
    color: z.string().optional().nullable(),
    event_type: z.enum(CALENDAR_EVENT_TYPES).default('custom'),
  })
  .refine(
    (data) => {
      if (data.end_date && data.start_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    { message: 'End date must be after start date', path: ['end_date'] },
  );

export type CreateCalendarEventInput = z.input<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255).optional(),
    description: z.string().max(2000).optional().nullable(),
    start_date: z
      .string()
      .min(1)
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, 'Invalid date format')
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, 'Invalid date format')
      .optional()
      .nullable(),
    all_day: z.boolean().optional(),
    color: z.string().optional().nullable(),
    event_type: z.enum(CALENDAR_EVENT_TYPES).optional(),
  })
  .refine(
    (data) => {
      if (data.end_date && data.start_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    { message: 'End date must be after start date', path: ['end_date'] },
  );

export type UpdateCalendarEventInput = z.input<typeof updateCalendarEventSchema>;
