import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { ordersRouter } from '../src/routes/orders.route.js';
import { ticketsRouter } from '../src/routes/tickets.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const order = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));

const ticket = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    order,
    ticket,
  },
}));

const app = express();
app.use(express.json());
app.use(ordersRouter);
app.use(ticketsRouter);
app.use(errorHandler);

const token = jwt.sign({ sub: '7', role: 'BUYER' }, env.JWT_SECRET);

describe('GET /orders/me e GET /tickets/me', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /orders/me', () => {
    it('retorna lista paginada de pedidos do usuário autenticado', async () => {
      order.findMany.mockResolvedValue([
        { id: 1, userId: 7, status: 'PAID' },
        { id: 2, userId: 7, status: 'PENDING' },
      ]);
      order.count.mockResolvedValue(2);

      const res = await request(app)
        .get('/orders/me?page=1&pageSize=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(10);
      expect(res.body.total).toBe(2);

      expect(order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 7 },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('exige autenticação', async () => {
      const res = await request(app).get('/orders/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /tickets/me', () => {
    it('retorna lista paginada de tickets do usuário autenticado', async () => {
      ticket.findMany.mockResolvedValue([
        { id: 1, code: 'TKT-1', status: 'VALID' },
        { id: 2, code: 'TKT-2', status: 'USED' },
      ]);
      ticket.count.mockResolvedValue(2);

      const res = await request(app)
        .get('/tickets/me?page=2&pageSize=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.page).toBe(2);
      expect(res.body.pageSize).toBe(5);
      expect(res.body.total).toBe(2);

      expect(ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { order: { userId: 7 } },
          skip: 5,
          take: 5,
        }),
      );
    });

    it('exige autenticação', async () => {
      const res = await request(app).get('/tickets/me');
      expect(res.status).toBe(401);
    });
  });
});
