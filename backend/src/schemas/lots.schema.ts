import { z } from 'zod';

export const createLotSchema = z
  .object({
    name: z.string().min(3, 'O nome do lote deve ter pelo menos 3 caracteres.'),
    price: z.coerce.number().min(0, 'O preço deve ser maior ou igual a zero.'),
    quantity: z.coerce.number().int().min(1, 'A quantidade deve ser de no mínimo 1 ingresso.'),
    salesStartAt: z.string().datetime({ message: 'A data de início das vendas deve estar no formato ISO 8601.' }),
    salesEndAt: z.string().datetime({ message: 'A data de término das vendas deve estar no formato ISO 8601.' }),
    active: z.boolean().optional().default(true),
  })
  .refine(
    (data) => new Date(data.salesEndAt) > new Date(data.salesStartAt),
    {
      message: 'A data de término das vendas deve ser posterior à data de início das vendas.',
      path: ['salesEndAt'],
    },
  );

export const updateLotSchema = z
  .object({
    name: z.string().min(3, 'O nome do lote deve ter pelo menos 3 caracteres.').optional(),
    price: z.coerce.number().min(0, 'O preço deve ser maior ou igual a zero.').optional(),
    quantity: z.coerce.number().int().min(1, 'A quantidade deve ser de no mínimo 1 ingresso.').optional(),
    salesStartAt: z.string().datetime({ message: 'A data de início das vendas deve estar no formato ISO 8601.' }).optional(),
    salesEndAt: z.string().datetime({ message: 'A data de término das vendas deve estar no formato ISO 8601.' }).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.salesStartAt && data.salesEndAt) {
        return new Date(data.salesEndAt) > new Date(data.salesStartAt);
      }
      return true;
    },
    {
      message: 'A data de término das vendas deve ser posterior à data de início das vendas.',
      path: ['salesEndAt'],
    },
  );

export type CreateLotInput = z.infer<typeof createLotSchema>;
export type UpdateLotInput = z.infer<typeof updateLotSchema>;
