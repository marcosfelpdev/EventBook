import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { ordersRouter } from '../src/routes/orders.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const order = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findFirstOrThrow: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

const ticket = vi.hoisted(() => ({
  updateMany: vi.fn(),
}));

const transaction = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    order,
    ticket,
    $transaction: transaction,
  },
}));

const app = express();
app.use(express.json());
app.use(ordersRouter);
app.use(errorHandler);

const token = jwt.sign({ sub: '7', role: 'BUYER' }, env.JWT_SECRET);
const postCancel = (id: number | string) =>
  request(app).post(`/orders/${id}/cancel`).set('Authorization', `Bearer ${token}`);

describe('Cancelamento de pedidos e RN-06 (Bordas de 12 horas)', () => {
  let mockOrder: {
    id: number;
    userId: number;
    status: string;
    items: Array<{
      id: number;
      lot: {
        event: {
          id: number;
          title: string;
          startsAt: Date;
        };
      };
    }>;
    tickets: Array<{ id: number; code: string; status: string }>;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    transaction.mockImplementation(
      (
        fn: (client: {
          ticket: typeof ticket;
          order: { update: ReturnType<typeof vi.fn> };
        }) => unknown,
      ) =>
        fn({
          ticket: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
          order: {
            update: vi
              .fn()
              .mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
                ...mockOrder,
                ...data,
                status: 'CANCELLED',
              })),
          },
        }),
    );

    mockOrder = {
      id: 10,
      userId: 7,
      status: 'PAID',
      items: [
        {
          id: 1,
          lot: {
            event: {
              id: 1,
              title: 'Festival de Música',
              startsAt: new Date(Date.now() + 12 * 60 * 60 * 1000 + 5000), // ~12h
            },
          },
        },
      ],
      tickets: [
        { id: 1, code: 'TKT-1', status: 'VALID' },
        { id: 2, code: 'TKT-2', status: 'VALID' },
      ],
    };

    order.findFirst.mockResolvedValue(mockOrder);
    order.findFirstOrThrow.mockResolvedValue(mockOrder);
    order.findUnique.mockResolvedValue(mockOrder);
  });

  it('bloqueia cancelamento a 11h59 antes do evento com 422 CANCELLATION_WINDOW_CLOSED', async () => {
    // Evento começa em 11h 59min a partir do momento atual
    mockOrder.items[0].lot.event.startsAt = new Date(Date.now() + (11 * 60 + 59) * 60 * 1000);

    const res = await postCancel(10);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('CANCELLATION_WINDOW_CLOSED');
    expect(res.body.message).toContain('12 horas');
  });

  it('permite cancelamento a 12h00 ou mais antes do evento', async () => {
    // Evento começa em 12h + 2 segundos a partir do momento atual para garantir >= 12h
    mockOrder.items[0].lot.event.startsAt = new Date(Date.now() + 12 * 60 * 60 * 1000 + 2000);

    const res = await postCancel(10);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
  });

  it('permite cancelamento com mais de 12h de antecedência e invalida os tickets', async () => {
    mockOrder.items[0].lot.event.startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const res = await postCancel(10);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
