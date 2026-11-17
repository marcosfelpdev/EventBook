import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { CreateOrderInput, CheckoutInput } from '../schemas/orders.schema.js';

export const RESERVATION_DURATION_MS = 15 * 60 * 1000;
export const CANCELLATION_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function getOrder(id: number, userId: number) {
  const owned = await prisma.order.findFirst({
    where: { id, userId },
    include: { items: true, tickets: true },
  });
  if (!owned) {
    throw new AppError(404, 'NOT_FOUND', 'Pedido não encontrado.');
  }
  await prisma.order.updateMany({
    where: { id, userId, status: 'PENDING', expiresAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return prisma.order.findFirstOrThrow({
    where: { id, userId },
    include: { items: true, tickets: true },
  });
}

export async function cancelOrder(id: number, userId: number, clock = () => new Date()) {
  const order = await getOrder(id, userId);
  const now = clock();

  if (order.status === 'CANCELLED') {
    return order;
  }

  if (order.status === 'EXPIRED') {
    throw new AppError(422, 'ORDER_EXPIRED', 'A reserva deste pedido expirou.');
  }

  if (order.status === 'PENDING') {
    const result = await prisma.order.updateMany({
      where: { id, userId, status: 'PENDING', expiresAt: { gt: now } },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    const updated = await getOrder(id, userId);
    if (result.count === 1 || updated.status === 'CANCELLED') {
      return updated;
    }
    throw new AppError(422, 'ORDER_EXPIRED', 'A reserva deste pedido expirou.');
  }

  if (order.status === 'PAID') {
    // RN-06: Bloquear cancelamento com menos de 12 horas do evento
    const orderWithEvent = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            lot: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    });

    const event = orderWithEvent?.items[0]?.lot?.event;
    if (event) {
      const eventStart = new Date(event.startsAt);
      const diffMs = eventStart.getTime() - now.getTime();

      if (diffMs < CANCELLATION_WINDOW_MS) {
        throw new AppError(
          422,
          'CANCELLATION_WINDOW_CLOSED',
          'O cancelamento não é permitido a menos de 12 horas do evento.',
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.ticket.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      });

      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: now },
        include: { items: true, tickets: true },
      });
    });
  }

  return order;
}

export async function checkoutOrder(
  id: number,
  userId: number,
  input?: CheckoutInput,
  clock = () => new Date(),
) {
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              lot: {
                include: {
                  event: true,
                },
              },
            },
          },
          tickets: true,
        },
      });

      if (!order || order.userId !== userId) {
        throw new AppError(404, 'NOT_FOUND', 'Pedido não encontrado.');
      }

      if (order.status === 'PAID') {
        throw new AppError(409, 'ORDER_ALREADY_PAID', 'Este pedido já foi pago.');
      }

      if (order.status === 'CANCELLED') {
        throw new AppError(422, 'ORDER_CANCELLED', 'Este pedido foi cancelado.');
      }

      const now = clock();
      if (order.status === 'EXPIRED' || order.expiresAt <= now) {
        if (order.status !== 'EXPIRED') {
          await tx.order.update({
            where: { id },
            data: { status: 'EXPIRED' },
          });
        }
        throw new AppError(422, 'ORDER_EXPIRED', 'A reserva deste pedido expirou.');
      }

      // Simulação do gateway de pagamento (injetável para testes)
      if (input?.simulateFailure) {
        throw new AppError(402, 'PAYMENT_FAILED', 'Falha no processamento do pagamento simulado.');
      }

      // Geração atômica dos ingressos com código único (RN-05)
      const ticketsData = [];
      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          const uniquePart = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
          const code = `TKT-${order.id}-${item.lotId}-${uniquePart}`;
          ticketsData.push({
            orderId: order.id,
            lotId: item.lotId,
            eventId: item.lot.eventId,
            code,
            status: 'VALID' as const,
            createdAt: now,
          });
        }
      }

      if (ticketsData.length > 0) {
        await tx.ticket.createMany({
          data: ticketsData,
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: now,
        },
        include: {
          items: true,
          tickets: true,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 15000,
    },
  );
}

export async function listMyOrders(
  userId: number,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
) {
  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            lot: {
              include: {
                event: {
                  select: { id: true, title: true, startsAt: true, endsAt: true, location: true },
                },
              },
            },
          },
        },
        tickets: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return { data, page, pageSize, total };
}

export function expireOrders(
  now = new Date(),
  client: Prisma.TransactionClient = prisma,
  lotId?: number,
) {
  return client.order.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
      ...(lotId === undefined ? {} : { items: { some: { lotId } } }),
    },
    data: { status: 'EXPIRED' },
  });
}

export async function createOrder(
  userId: number,
  input: CreateOrderInput,
  clock = () => new Date(),
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM ticket_lots WHERE id = ${input.lotId} FOR UPDATE`;
      const lot = await tx.ticketLot.findUnique({
        where: { id: input.lotId },
        include: { event: true },
      });
      if (!lot) {
        throw new AppError(404, 'NOT_FOUND', 'Lote não encontrado.');
      }
      if (lot.event.status !== 'PUBLISHED') {
        throw new AppError(422, 'EVENT_NOT_PUBLISHED', 'O evento não está publicado.');
      }
      const now = clock();
      await expireOrders(now, tx, lot.id);
      if (!lot.active) {
        throw new AppError(422, 'LOT_INACTIVE', 'O lote está inativo.');
      }
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
          lotId: lot.id,
          available,
          requested: input.quantity,
        });
      }
      return tx.order.create({
        data: {
          userId,
          status: 'PENDING',
          createdAt: now,
          expiresAt: new Date(now.getTime() + RESERVATION_DURATION_MS),
          total: lot.price.mul(input.quantity),
          items: {
            create: { lotId: lot.id, quantity: input.quantity, unitPriceSnapshot: lot.price },
          },
        },
        include: { items: true },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 15000,
    },
  );
}
