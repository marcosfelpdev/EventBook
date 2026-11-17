import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { ordersRouter } from '../src/routes/orders.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const tx = vi.hoisted(() => ({
  order: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ticket: {
    createMany: vi.fn(),
  },
}));

const transaction = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    $transaction: transaction,
  },
}));

const app = express();
app.use(express.json());
app.use(ordersRouter);
app.use(errorHandler);

const token = jwt.sign({ sub: '7', role: 'BUYER' }, env.JWT_SECRET);
const postCheckout = (id: number | string, body = {}) =>
  request(app).post(`/orders/${id}/checkout`).set('Authorization', `Bearer ${token}`).send(body);

describe('Checkout e RN-05 (Transação Atômica)', () => {
  let mockOrder: {
    id: number;
    userId: number;
    status: string;
    expiresAt: Date;
    total: Prisma.Decimal;
    items: Array<{
      id: number;
      orderId: number;
      lotId: number;
      quantity: number;
      unitPriceSnapshot: Prisma.Decimal;
      lot: {
        id: number;
        eventId: number;
        name: string;
        event: { id: number; title: string };
      };
    }>;
    tickets: Array<{ id: number; code: string; status: string }>;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    transaction.mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));

    mockOrder = {
      id: 10,
      userId: 7,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 600000), // 10 min no futuro
      total: new Prisma.Decimal('50.00'),
      items: [
        {
          id: 1,
          orderId: 10,
          lotId: 101,
          quantity: 2,
          unitPriceSnapshot: new Prisma.Decimal('25.00'),
          lot: {
            id: 101,
            eventId: 50,
            name: 'Pista',
            event: { id: 50, title: 'Show Acústico' },
          },
        },
      ],
      tickets: [],
    };

    tx.order.findUnique.mockResolvedValue(mockOrder);
    tx.ticket.createMany.mockResolvedValue({ count: 2 });
    tx.order.update.mockImplementation(async ({ data }) => ({
      ...mockOrder,
      ...data,
      tickets: [
        { id: 1, code: 'TKT-10-101-ABCD1234', status: 'VALID' },
        { id: 2, code: 'TKT-10-101-EFGH5678', status: 'VALID' },
      ],
    }));
  });

  it('realiza checkout com sucesso, marca como PAID e gera tickets com códigos únicos', async () => {
    const res = await postCheckout(10, { paymentMethod: 'CREDIT_CARD' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAID');
    expect(res.body.paidAt).toBeDefined();

    expect(tx.ticket.createMany).toHaveBeenCalledTimes(1);
    const ticketsCallArg = tx.ticket.createMany.mock.calls[0][0];
    expect(ticketsCallArg.data).toHaveLength(2);
    expect(ticketsCallArg.data[0].orderId).toBe(10);
    expect(ticketsCallArg.data[0].lotId).toBe(101);
    expect(ticketsCallArg.data[0].eventId).toBe(50);
    expect(ticketsCallArg.data[0].status).toBe('VALID');
    expect(ticketsCallArg.data[0].code).toMatch(/^TKT-10-101-[A-F0-9]{8}$/);
    expect(ticketsCallArg.data[1].code).toMatch(/^TKT-10-101-[A-F0-9]{8}$/);
    expect(ticketsCallArg.data[0].code).not.toBe(ticketsCallArg.data[1].code);

    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          status: 'PAID',
          paidAt: expect.any(Date),
        }),
      }),
    );
  });

  it('quando gateway simula falha, lança PAYMENT_FAILED e nenhum ticket é criado (rollback completo)', async () => {
    const res = await postCheckout(10, {
      paymentMethod: 'CREDIT_CARD',
      simulateFailure: true,
    });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYMENT_FAILED');
    expect(tx.ticket.createMany).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('bloqueia checkout de pedido já pago com 409 ORDER_ALREADY_PAID', async () => {
    mockOrder.status = 'PAID';
    const res = await postCheckout(10);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ORDER_ALREADY_PAID');
    expect(tx.ticket.createMany).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('bloqueia checkout de pedido cancelado com 422 ORDER_CANCELLED', async () => {
    mockOrder.status = 'CANCELLED';
    const res = await postCheckout(10);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ORDER_CANCELLED');
    expect(tx.ticket.createMany).not.toHaveBeenCalled();
  });

  it('bloqueia checkout de pedido expirado com 422 ORDER_EXPIRED', async () => {
    mockOrder.expiresAt = new Date(Date.now() - 1000); // Expirado no passado
    const res = await postCheckout(10);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ORDER_EXPIRED');
    expect(tx.ticket.createMany).not.toHaveBeenCalled();
  });

  it('retorna 404 se o pedido não pertencer ao usuário autenticado', async () => {
    mockOrder.userId = 999;
    const res = await postCheckout(10);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(tx.ticket.createMany).not.toHaveBeenCalled();
  });
});
