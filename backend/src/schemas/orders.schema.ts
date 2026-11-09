import { z } from 'zod';

export const createOrderSchema = z.object({
  lotId: z.number().int().positive().max(2147483647),
  quantity: z.number().int().positive().max(2147483647),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
