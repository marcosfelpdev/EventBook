import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { CreateOrderInput } from '../schemas/orders.schema.js';

export const RESERVATION_DURATION_MS = 15 * 60 * 1000;

export function expireOrders(now = new Date(), client: Prisma.TransactionClient = prisma, lotId?: number) {
  return client.order.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
      ...(lotId === undefined ? {} : { items: { some: { lotId } } }),
    },
    data: { status: 'EXPIRED' },
  });
}

export async function createOrder(userId: number, input: CreateOrderInput, clock = () => new Date()) {
  return prisma.$transaction(async (tx) => {
    const lot = await tx.ticketLot.findUnique({ where: { id: input.lotId }, include: { event: true } });
    if (!lot) {throw new AppError(404, 'NOT_FOUND', 'Lote não encontrado.');}
    if (lot.event.status !== 'PUBLISHED') {
      throw new AppError(422, 'EVENT_NOT_PUBLISHED', 'O evento não está publicado.');
    }
    const now = clock();
    await expireOrders(now, tx, lot.id);
    if (!lot.active) {throw new AppError(422, 'LOT_INACTIVE', 'O lote está inativo.');}
    if (now < lot.salesStartAt || now > lot.salesEndAt) {
      throw new AppError(422, 'LOT_OUT_OF_SALE_WINDOW', 'O lote está fora da janela de venda.');
    }
    const reserved = await tx.orderItem.aggregate({
      where: {
        lotId: lot.id,
        order: { OR: [{ status: 'PAID' }, { status: 'PENDING', expiresAt: { gt: now } }] },
      },
      _sum: { quantity: true },
    });
    const available = lot.quantity - (reserved._sum.quantity ?? 0);
    if (input.quantity > available) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'Não há ingressos suficientes neste lote.', {
        lotId: lot.id, available, requested: input.quantity,
      });
    }
    return tx.order.create({
      data: {
        userId,
        status: 'PENDING',
        createdAt: now,
        expiresAt: new Date(now.getTime() + RESERVATION_DURATION_MS),
        total: lot.price.mul(input.quantity),
        items: { create: { lotId: lot.id, quantity: input.quantity, unitPriceSnapshot: lot.price } },
      },
      include: { items: true },
    });
  });
}
