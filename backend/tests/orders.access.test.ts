import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { ordersRouter } from '../src/routes/orders.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const order = vi.hoisted(() => ({ findFirst: vi.fn(), findFirstOrThrow: vi.fn(), updateMany: vi.fn() }));
vi.mock('../src/lib/prisma.js', () => ({ prisma: { order } }));
const app = express();
app.use(express.json());
app.use(ordersRouter);
app.use(errorHandler);
const token = jwt.sign({ sub: '7', role: 'BUYER' }, env.JWT_SECRET);
let stored: { id: number; userId: number; status: string; expiresAt: Date; items: unknown[] };

describe('Consulta e cancelamento de pedidos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    stored = { id: 1, userId: 7, status: 'PENDING', expiresAt: new Date(Date.now() + 900000), items: [] };
    order.findFirst.mockImplementation(async ({ where }) => where.userId === stored.userId ? { ...stored } : null);
    order.findFirstOrThrow.mockImplementation(async () => ({ ...stored }));
    order.updateMany.mockImplementation(async ({ where, data }) => {
      const matches = stored.status === where.status &&
        (where.expiresAt.lte ? stored.expiresAt <= where.expiresAt.lte : stored.expiresAt > where.expiresAt.gt);
      if (matches) {
        stored = { ...stored, ...data };
      }
      return { count: matches ? 1 : 0 };
    });
  });
  it('retorna pedido e itens apenas para o dono', async () => {
    const res = await request(app).get('/orders/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, userId: 7, items: [] });
    expect(order.findFirst).toHaveBeenCalledWith({ where: { id: 1, userId: 7 }, include: { items: true } });
  });
  it('nega consulta e cancelamento de outro usuário sem revelar o pedido', async () => {
    stored.userId = 99;
    expect((await request(app).get('/orders/1').set('Authorization', `Bearer ${token}`)).status).toBe(404);
    expect((await request(app).post('/orders/1/cancel').set('Authorization', `Bearer ${token}`)).status).toBe(404);
    expect(order.updateMany).not.toHaveBeenCalled();
  });
  it('exige autenticação e identificador válido', async () => {
    expect((await request(app).get('/orders/1')).status).toBe(401);
    expect((await request(app).post('/orders/1/cancel')).status).toBe(401);
    const responses = await Promise.all(['0', '-1', 'abc', '1.5', '2147483648'].map((id) =>
      request(app).get(`/orders/${id}`).set('Authorization', `Bearer ${token}`)));
    expect(responses.map((response) => response.status)).toEqual([400, 400, 400, 400, 400]);
  });
  it('cancela pendente e repetir não altera o estado novamente', async () => {
    const cancel = () => request(app).post('/orders/1/cancel').set('Authorization', `Bearer ${token}`);
    expect((await cancel()).body.status).toBe('CANCELLED');
    expect((await cancel()).status).toBe(200);
    expect(stored.status).toBe('CANCELLED');
  });
  it('consulta aplica expiração e cancelamento vencido retorna 422', async () => {
    stored.expiresAt = new Date(0);
    expect((await request(app).get('/orders/1').set('Authorization', `Bearer ${token}`)).body.status).toBe('EXPIRED');
    const res = await request(app).post('/orders/1/cancel').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('ORDER_EXPIRED');
  });
  it('não cancela pedido pago', async () => {
    stored.status = 'PAID';
    const res = await request(app).post('/orders/1/cancel').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ORDER_ALREADY_PAID');
    expect(stored.status).toBe('PAID');
  });
});
