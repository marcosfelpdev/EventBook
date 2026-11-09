import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { ordersRouter } from '../src/routes/orders.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const tx = vi.hoisted(() => ({
  ticketLot: { findUnique: vi.fn() },
  order: { updateMany: vi.fn(), create: vi.fn() },
  orderItem: { aggregate: vi.fn() },
}));
vi.mock('../src/lib/prisma.js', () => ({ prisma: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } }));

const app = express();
app.use(express.json());
app.use(ordersRouter);
app.use(errorHandler);
const token = jwt.sign({ sub: '7', role: 'BUYER' }, env.JWT_SECRET);
const payload = { lotId: 1, quantity: 2 };
const post = () => request(app).post('/orders').set('Authorization', `Bearer ${token}`);
const lot = {
  id: 1, quantity: 5, active: true, price: new Prisma.Decimal('19.90'),
  salesStartAt: new Date('2020-01-01'), salesEndAt: new Date('2099-01-01'),
  event: { status: 'PUBLISHED' },
};

describe('Criação de pedidos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    tx.ticketLot.findUnique.mockResolvedValue(lot);
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    tx.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 1 } });
    tx.order.create.mockImplementation(async ({ data }) => ({ id: 10, ...data }));
  });

  it('grava dono autenticado, snapshot, total e prazo exato', async () => {
    const response = await post().send({ ...payload, userId: 999, price: 0 });
    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(7);
    expect(response.body.total).toBe('39.8');
    expect(new Date(response.body.expiresAt).getTime() - new Date(response.body.createdAt).getTime()).toBe(900000);
    expect(tx.order.create.mock.calls[0][0].data.items.create.unitPriceSnapshot.toString()).toBe('19.9');
    expect(tx.order.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.orderItem.aggregate.mock.invocationCallOrder[0]);
  });
  it('exige autenticação e perfil BUYER', async () => {
    expect((await request(app).post('/orders').send(payload)).status).toBe(401);
    const otherToken = jwt.sign({ sub: '7', role: 'ORGANIZER' }, env.JWT_SECRET);
    expect((await request(app).post('/orders').set('Authorization', `Bearer ${otherToken}`).send(payload)).status).toBe(403);
  });
  it.each([0, -1, 1.5, '2', 2147483648])('rejeita quantidade inválida %s', async (quantity) => {
    expect((await post().send({ ...payload, quantity })).status).toBe(400);
    expect(tx.order.create).not.toHaveBeenCalled();
  });
  it('retorna 404 para lote inexistente', async () => {
    tx.ticketLot.findUnique.mockResolvedValue(null);
    expect((await post().send(payload)).status).toBe(404);
  });
  it('não reserva evento não publicado', async () => {
    tx.ticketLot.findUnique.mockResolvedValue({ ...lot, event: { status: 'DRAFT' } });
    expect((await post().send(payload)).body.code).toBe('EVENT_NOT_PUBLISHED');
  });
  it('retorna 409 com estoque disponível e não grava pedido', async () => {
    tx.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 4 } });
    const response = await post().send(payload);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'INSUFFICIENT_STOCK', details: { available: 1, requested: 2 } });
    expect(tx.order.create).not.toHaveBeenCalled();
  });
  it('inclui pagos e pendentes não vencidos no cálculo', async () => {
    await post().send(payload);
    expect(tx.orderItem.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { lotId: 1, order: { OR: [{ status: 'PAID' }, { status: 'PENDING', expiresAt: { gt: expect.any(Date) } }] } },
    }));
  });
});
