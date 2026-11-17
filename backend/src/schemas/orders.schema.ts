import { z } from 'zod';

export const createOrderSchema = z.object({
  lotId: z.number().int().positive().max(2147483647),
  quantity: z.number().int().positive().max(2147483647),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const checkoutSchema = z.object({
  paymentMethod: z.enum(['CREDIT_CARD', 'PIX', 'BOLETO']).default('CREDIT_CARD'),
  simulateFailure: z.boolean().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
