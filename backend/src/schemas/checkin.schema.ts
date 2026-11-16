import { z } from 'zod';

export const checkinSchema = z.object({
  code: z.string().min(1, 'O código do ingresso é obrigatório.').max(100),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
