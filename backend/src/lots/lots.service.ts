import { AppError } from '../errors/app-error.js';
import { prisma } from '../lib/prisma.js';
import type { UpdateLotInput } from './lots.schema.js';

interface RequestingUserContext {
  id?: number;
  role?: string;
}

const lotSelect = {
  id: true,
  eventId: true,
  name: true,
  price: true,
  quantity: true,
  salesStartAt: true,
  salesEndAt: true,
  active: true,
} as const;

export async function listEventLots(eventId: number, user?: RequestingUserContext) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, status: true },
  });

  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  const isOwner = user?.role === 'ORGANIZER' && user.id === event.organizerId;
  const isAdmin = user?.role === 'ADMIN';
  if (event.status !== 'PUBLISHED' && !isOwner && !isAdmin) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  return prisma.ticketLot.findMany({
    where: {
      eventId,
      ...(!isOwner && { active: true }),
    },
    orderBy: { id: 'asc' },
    select: lotSelect,
  });
}

export async function updateEventLot(
  eventId: number,
  lotId: number,
  organizerId: number,
  input: UpdateLotInput,
) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true, capacity: true, startsAt: true, endsAt: true },
    });

    if (!event) {
      throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
    }

    if (event.organizerId !== organizerId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Você não tem permissão para editar os lotes deste evento.',
      );
    }

    const existingLot = await tx.ticketLot.findFirst({
      where: { id: lotId, eventId },
      select: lotSelect,
    });

    if (!existingLot) {
      throw new AppError(404, 'LOT_NOT_FOUND', 'Lote não encontrado para este evento.');
    }

    const salesStartAt = input.salesStartAt
      ? new Date(input.salesStartAt)
      : existingLot.salesStartAt;
    const salesEndAt = input.salesEndAt ? new Date(input.salesEndAt) : existingLot.salesEndAt;
    if (salesStartAt < event.startsAt || salesEndAt > event.endsAt || salesEndAt <= salesStartAt) {
      throw new AppError(
        422,
        'INVALID_SALES_WINDOW',
        'A janela de vendas deve ser válida e estar dentro da duração do evento.',
      );
    }

    if (input.quantity !== undefined) {
      const otherLots = await tx.ticketLot.aggregate({
        where: { eventId, id: { not: lotId } },
        _sum: { quantity: true },
      });
      const otherQuantity = otherLots._sum.quantity ?? 0;
      if (otherQuantity + input.quantity > event.capacity) {
        throw new AppError(
          422,
          'EVENT_CAPACITY_EXCEEDED',
          'A soma das quantidades dos lotes não pode exceder a capacidade do evento.',
          {
            capacity: event.capacity,
            otherLotsQuantity: otherQuantity,
            requestedQuantity: input.quantity,
          },
        );
      }
    }

    const data = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.salesStartAt !== undefined && { salesStartAt }),
      ...(input.salesEndAt !== undefined && { salesEndAt }),
      ...(input.active !== undefined && { active: input.active }),
    };

    return tx.ticketLot.update({
      where: { id: lotId },
      data,
      select: lotSelect,
    });
  });
}
