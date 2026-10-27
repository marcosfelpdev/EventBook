import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { CreateLotInput, UpdateLotInput } from '../schemas/lots.schema.js';

interface RequestingUserContext {
  id?: number;
  role?: string;
}

export async function listLots(eventId: number, userContext?: RequestingUserContext) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  const isOwner = userContext?.id === event.organizerId;
  const isAdmin = userContext?.role === 'ADMIN';

  // Organizador (dono) ou ADMIN vê todos os lotes; público vê apenas lotes ativos
  const whereClause = isOwner || isAdmin
    ? { eventId }
    : { eventId, active: true };

  const lots = await prisma.ticketLot.findMany({
    where: whereClause,
    orderBy: { salesStartAt: 'asc' },
  });

  return lots;
}

export async function createLot(
  eventId: number,
  organizerId: number,
  input: CreateLotInput,
  userRole?: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { lots: true },
  });

  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  const isOwner = event.organizerId === organizerId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para gerenciar lotes deste evento.');
  }

  // Consistência de datas: a janela de venda do lote deve encerrar antes ou no término do evento
  const salesEnd = new Date(input.salesEndAt);
  const salesStart = new Date(input.salesStartAt);
  const eventEnd = new Date(event.endsAt);

  if (salesEnd > eventEnd) {
    throw new AppError(
      422,
      'INVALID_SALE_WINDOW',
      'A data de término das vendas não pode ultrapassar o término do evento.',
    );
  }

  if (salesStart >= salesEnd) {
    throw new AppError(
      422,
      'INVALID_SALE_WINDOW',
      'A data de término das vendas deve ser posterior à data de início das vendas.',
    );
  }

  // Soma dos lotes ≤ capacity do evento
  const currentTotalQuantity = event.lots.reduce((acc, lot) => acc + lot.quantity, 0);
  if (currentTotalQuantity + input.quantity > event.capacity) {
    throw new AppError(
      422,
      'LOT_CAPACITY_EXCEEDED',
      `A soma da quantidade dos lotes (${currentTotalQuantity + input.quantity}) excede a capacidade máxima do evento (${event.capacity}).`,
    );
  }

  const lot = await prisma.ticketLot.create({
    data: {
      eventId,
      name: input.name,
      price: input.price,
      quantity: input.quantity,
      salesStartAt: salesStart,
      salesEndAt: salesEnd,
      active: input.active ?? true,
    },
  });

  return lot;
}

export async function updateLot(
  eventId: number,
  lotId: number,
  organizerId: number,
  input: UpdateLotInput,
  userRole?: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { lots: true },
  });

  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  const isOwner = event.organizerId === organizerId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para editar lotes deste evento.');
  }

  const existingLot = event.lots.find((l) => l.id === lotId);
  if (!existingLot) {
    throw new AppError(404, 'LOT_NOT_FOUND', 'Lote não encontrado.');
  }

  // Revalidar datas
  const effectiveStart = input.salesStartAt ? new Date(input.salesStartAt) : existingLot.salesStartAt;
  const effectiveEnd = input.salesEndAt ? new Date(input.salesEndAt) : existingLot.salesEndAt;
  const eventEnd = new Date(event.endsAt);

  if (effectiveEnd > eventEnd) {
    throw new AppError(
      422,
      'INVALID_SALE_WINDOW',
      'A data de término das vendas não pode ultrapassar o término do evento.',
    );
  }

  if (effectiveStart >= effectiveEnd) {
    throw new AppError(
      422,
      'INVALID_SALE_WINDOW',
      'A data de término das vendas deve ser posterior à data de início das vendas.',
    );
  }

  // Revalidar capacidade se quantidade foi alterada
  if (input.quantity !== undefined) {
    const otherLotsQuantity = event.lots
      .filter((l) => l.id !== lotId)
      .reduce((acc, lot) => acc + lot.quantity, 0);

    if (otherLotsQuantity + input.quantity > event.capacity) {
      throw new AppError(
        422,
        'LOT_CAPACITY_EXCEEDED',
        `A soma da quantidade dos lotes (${otherLotsQuantity + input.quantity}) excede a capacidade máxima do evento (${event.capacity}).`,
      );
    }
  }

  const updatedLot = await prisma.ticketLot.update({
    where: { id: lotId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.salesStartAt !== undefined && { salesStartAt: effectiveStart }),
      ...(input.salesEndAt !== undefined && { salesEndAt: effectiveEnd }),
      ...(input.active !== undefined && { active: input.active }),
    },
  });

  return updatedLot;
}
