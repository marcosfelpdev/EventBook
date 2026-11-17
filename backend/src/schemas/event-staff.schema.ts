import { z } from 'zod';

export const addEventStaffSchema = z
  .object({
    userId: z.number().int().positive().max(2147483647).optional(),
    email: z.string().email('E-mail inválido.').optional(),
  })
  .refine((data) => data.userId !== undefined || data.email !== undefined, {
    message: 'Informe o ID ou e-mail do usuário staff.',
  });

export type AddEventStaffInput = z.infer<typeof addEventStaffSchema>;

