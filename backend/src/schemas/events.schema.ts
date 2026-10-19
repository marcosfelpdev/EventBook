import { z } from 'zod';
import { EventStatus } from '@prisma/client';

export const createEventSchema = z
  .object({
    title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
    description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
    location: z.string().min(3, 'A localização deve ter pelo menos 3 caracteres.'),
    capacity: z.coerce.number().int().min(1, 'A capacidade deve ser de no mínimo 1 pessoa.'),
    startsAt: z.string().datetime({ message: 'A data de início deve estar no formato ISO 8601.' }),
    endsAt: z.string().datetime({ message: 'A data de término deve estar no formato ISO 8601.' }),
  })
  .refine(
    (data) => new Date(data.startsAt) > new Date(),
    {
      message: 'A data de início deve estar no futuro.',
      path: ['startsAt'],
    },
  )
  .refine(
    (data) => new Date(data.endsAt) > new Date(data.startsAt),
    {
      message: 'A data de término deve ser posterior à data de início.',
      path: ['endsAt'],
    },
  );

export const updateEventSchema = z
  .object({
    title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.').optional(),
    description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.').optional(),
    location: z.string().min(3, 'A localização deve ter pelo menos 3 caracteres.').optional(),
    capacity: z.coerce.number().int().min(1, 'A capacidade deve ser de no mínimo 1 pessoa.').optional(),
    startsAt: z.string().datetime({ message: 'A data de início deve estar no formato ISO 8601.' }).optional(),
    endsAt: z.string().datetime({ message: 'A data de término deve estar no formato ISO 8601.' }).optional(),
    status: z.nativeEnum(EventStatus).optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'A data de término deve ser posterior à data de início.',
      path: ['endsAt'],
    },
  );

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQueryInput = z.infer<typeof listEventsQuerySchema>;
