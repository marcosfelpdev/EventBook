import { z } from 'zod';

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListTicketsQueryInput = z.infer<typeof listTicketsQuerySchema>;
