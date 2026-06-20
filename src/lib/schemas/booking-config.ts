import { z } from 'zod';

/**
 * A single named part of a day (e.g. "Πρωί", "Απόγευμα").
 */
export const timeSlotNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters');

export const createTimeSlotSchema = z.object({
  name: timeSlotNameSchema,
});

export type CreateTimeSlotInput = z.infer<typeof createTimeSlotSchema>;

export const renameTimeSlotSchema = z.object({
  name: timeSlotNameSchema,
});

export type RenameTimeSlotInput = z.infer<typeof renameTimeSlotSchema>;

export const reorderTimeSlotsSchema = z.object({
  ordered_ids: z
    .array(z.string().uuid('Invalid time slot id'))
    .min(1, 'At least one slot required'),
});

export type ReorderTimeSlotsInput = z.infer<typeof reorderTimeSlotsSchema>;

/**
 * Global capacity = number of crews that can film in the same Time Slot.
 * Coerced so plain HTML number inputs validate at the boundary.
 */
export const capacitySchema = z.object({
  capacity: z.coerce
    .number()
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1'),
});

export type CapacityInput = z.infer<typeof capacitySchema>;
