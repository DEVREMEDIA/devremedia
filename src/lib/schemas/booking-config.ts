import { z } from 'zod';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH = /^\d{4}-\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const createDurationSchema = z.object({
  minutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60),
});
export type CreateDurationInput = z.infer<typeof createDurationSchema>;

export const reorderDurationsSchema = z.object({
  ordered_ids: z.array(z.string().uuid()).min(1),
});
export type ReorderDurationsInput = z.infer<typeof reorderDurationsSchema>;

export const slotIntervalSchema = z.object({
  interval: z.coerce.number().int().min(5).max(240),
});
export type SlotIntervalInput = z.infer<typeof slotIntervalSchema>;

export const capacitySchema = z.object({
  capacity: z.coerce.number().int().min(1),
});
export type CapacityInput = z.infer<typeof capacitySchema>;

export const weekdayHoursSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    is_open: z.boolean(),
    open_time: z.string().regex(TIME).nullable(),
    close_time: z.string().regex(TIME).nullable(),
  })
  .refine((v) => !v.is_open || (v.open_time && v.close_time && v.open_time < v.close_time), {
    message: 'Open days need an open time before the close time',
  });
export type WeekdayHoursInput = z.infer<typeof weekdayHoursSchema>;

export const dayAvailabilitySchema = z
  .object({
    date: z.string().regex(DATE),
    is_open: z.boolean(),
    open_time: z.string().regex(TIME),
    close_time: z.string().regex(TIME),
  })
  .refine((v) => v.open_time < v.close_time, { message: 'Open time must precede close time' });
export type DayAvailabilityInput = z.infer<typeof dayAvailabilitySchema>;

export const monthSchema = z.string().regex(MONTH, 'Expected YYYY-MM');
