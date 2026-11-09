import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { createOrderFixture, removeOrderFixture } from './orders.fixture.js';

describe('RN-03: concorrência HTTP com MySQL real', () => {
  let fixture: Awaited<ReturnType<typeof createOrderFixture>>;
  beforeEach(async () => { fixture = await createOrderFixture(); });
  afterEach(async () => { if (fixture) { await removeOrderFixture(fixture); } });
  afterAll(async () => { await prisma.$disconnect(); });

  const buy = (quantity = 1) => request(app).post('/orders')
    .set('Authorization', `Bearer ${fixture.token}`).send({ lotId: fixture.lot.id, quantity });

  it.each([1, 2, 3])('rodada %i: 20 pedidos disputam 5 ingressos sem exceder o saldo', async () => {
    const responses = await Promise.all(Array.from({ length: 20 }, () => buy()));
    expect(responses.filter((res) => res.status === 201)).toHaveLength(5);
    const rejected = responses.filter((res) => res.status !== 201);
    expect(rejected).toHaveLength(15);
    for (const response of rejected) {
      expect(response.status).toBe(409);
      expect(response.body.code).toBe('INSUFFICIENT_STOCK');
    }
    const occupied = await prisma.orderItem.aggregate({ where: { lotId: fixture.lot.id }, _sum: { quantity: true } });
    expect(occupied._sum.quantity).toBe(5);
    expect(await prisma.order.count({ where: { userId: fixture.user.id } })).toBe(5);
  });

  it('reserva quantidades maiores atomicamente, sem pedido parcial', async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => buy(3)));
    expect(responses.filter((res) => res.status === 201)).toHaveLength(1);
    expect(responses.filter((res) => res.status === 409)).toHaveLength(9);
    expect((await buy(2)).status).toBe(201);
    const occupied = await prisma.orderItem.aggregate({ where: { lotId: fixture.lot.id }, _sum: { quantity: true } });
    expect(occupied._sum.quantity).toBe(5);
  });

  it('contabiliza pedidos pagos na disputa concorrente', async () => {
    const first = await buy(3);
    expect(first.status).toBe(201);
    await prisma.order.update({ where: { id: first.body.id }, data: { status: 'PAID', paidAt: new Date() } });
    const responses = await Promise.all(Array.from({ length: 10 }, () => buy()));
    expect(responses.filter((res) => res.status === 201)).toHaveLength(2);
    expect(responses.filter((res) => res.status === 409)).toHaveLength(8);
    const occupied = await prisma.orderItem.aggregate({ where: { lotId: fixture.lot.id }, _sum: { quantity: true } });
    expect(occupied._sum.quantity).toBe(5);
  });
});
