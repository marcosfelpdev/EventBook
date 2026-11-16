import { z } from 'zod';

export const addEventStaffSchema = z.object({
  userId: z.number().int().positive().max(2147483647),
});

export type AddEventStaffInput = z.infer<typeof addEventStaffSchema>;
