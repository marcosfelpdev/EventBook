import { z } from 'zod';

const priceSchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/,
    'O preço deve ser um valor decimal com até duas casas.',
  );

export const updateLotSchema = z
  .object({
    name: z.string().trim().min(1, 'O nome do lote é obrigatório.').max(191).optional(),
    price: priceSchema.optional(),
    quantity: z.coerce
      .number()
      .int()
      .min(1, 'A quantidade deve ser de no mínimo 1 ingresso.')
      .optional(),
    salesStartAt: z
      .string()
      .datetime({ message: 'O início das vendas deve estar no formato ISO 8601.' })
      .optional(),
    salesEndAt: z
      .string()
      .datetime({ message: 'O fim das vendas deve estar no formato ISO 8601.' })
      .optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar o lote.',
  });

export type UpdateLotInput = z.infer<typeof updateLotSchema>;
