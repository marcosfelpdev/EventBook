import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { cancelOrder, createOrder, expireOrders, RESERVATION_DURATION_MS } from '../../src/services/orders.service.js';
import { createOrderFixture, removeOrderFixture } from './orders.fixture.js';

describe('RN-04: prazo e liberação de estoque com MySQL real', () => {
  let fixture: Awaited<ReturnType<typeof createOrderFixture>>;
  let createdAt: Date;
  beforeEach(async () => {
    fixture = await createOrderFixture(1);
    createdAt = new Date();
  });
  afterEach(async () => { if (fixture) { await removeOrderFixture(fixture); } });
  afterAll(async () => { await prisma.$disconnect(); });
  const buy = (now = createdAt) => createOrder(fixture.user.id, { lotId: fixture.lot.id, quantity: 1 }, () => now);

  it('reserva continua válida 1ms antes e expira exatamente aos 15 minutos por lazy', async () => {
    const first = await buy();
    expect(first.expiresAt.getTime() - first.createdAt.getTime()).toBe(RESERVATION_DURATION_MS);
    await expect(buy(new Date(first.expiresAt.getTime() - 1)))
      .rejects.toMatchObject({ statusCode: 409, code: 'INSUFFICIENT_STOCK' });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('PENDING');
    expect((await buy(first.expiresAt)).status).toBe('PENDING');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('EXPIRED');
  });

  it('função usada pelo job expira no limite, libera estoque e é idempotente', async () => {
    const first = await buy();
    expect((await expireOrders(new Date(first.expiresAt.getTime() - 1), prisma, fixture.lot.id)).count).toBe(0);
    expect((await expireOrders(first.expiresAt, prisma, fixture.lot.id)).count).toBe(1);
    expect((await expireOrders(first.expiresAt, prisma, fixture.lot.id)).count).toBe(0);
    expect((await buy(first.expiresAt)).status).toBe('PENDING');
  });

  it('libera uma reserva depois do prazo sem depender do timer', async () => {
    const first = await buy();
    const next = await buy(new Date(first.expiresAt.getTime() + 1));
    expect(next.id).not.toBe(first.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('EXPIRED');
  });

  it.each(['PAID', 'CANCELLED'] as const)('expiração não altera pedido %s', async (status) => {
    const first = await buy();
    await prisma.order.update({ where: { id: first.id }, data: { status } });
    expect((await expireOrders(first.expiresAt, prisma, fixture.lot.id)).count).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).status).toBe(status);
    if (status === 'PAID') {
      await expect(buy(first.expiresAt)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    }
  });

  it('cancelamento libera saldo e não libera duas vezes quando repetido', async () => {
    const first = await buy();
    await Promise.all([cancelOrder(first.id, fixture.user.id), cancelOrder(first.id, fixture.user.id)]);
    const second = await buy();
    expect(second.status).toBe('PENDING');
    await expect(buy()).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('snapshot e total permanecem iguais depois de alterar o preço do lote', async () => {
    const first = await buy();
    await prisma.ticketLot.update({ where: { id: fixture.lot.id }, data: { price: '99.90' } });
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: first.id }, include: { items: true } });
    expect(stored.total.toFixed(2)).toBe('19.90');
    expect(stored.items[0].unitPriceSnapshot.toFixed(2)).toBe('19.90');
  });

  it('falha ao gravar reverte pedido, item e atualização lazy da mesma transação', async () => {
    const first = await buy();
    await expect(createOrder(-1, { lotId: fixture.lot.id, quantity: 1 }, () => first.expiresAt)).rejects.toThrow();
    expect(await prisma.order.count({ where: { userId: fixture.user.id } })).toBe(1);
    expect(await prisma.orderItem.count({ where: { lotId: fixture.lot.id } })).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('PENDING');
    expect((await buy(first.expiresAt)).status).toBe('PENDING');
  });
});
