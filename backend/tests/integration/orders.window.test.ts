import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { createOrder } from '../../src/services/orders.service.js';
import { createOrderFixture, removeOrderFixture } from './orders.fixture.js';

describe('RN-02: bordas da janela com MySQL real', () => {
  let fixture: Awaited<ReturnType<typeof createOrderFixture>>;
  const start = new Date('2030-01-01T10:00:00.000Z');
  const end = new Date('2030-01-01T12:00:00.000Z');
  beforeEach(async () => {
    fixture = await createOrderFixture();
    await prisma.ticketLot.update({ where: { id: fixture.lot.id }, data: { salesStartAt: start, salesEndAt: end } });
  });
  afterEach(async () => { if (fixture) { await removeOrderFixture(fixture); } });
  afterAll(async () => { await prisma.$disconnect(); });

  it.each([
    ['antes do início', '2030-01-01T09:59:59.999Z', false],
    ['início exato', '2030-01-01T10:00:00.000Z', true],
    ['após o início', '2030-01-01T10:00:00.001Z', true],
    ['antes do fim', '2030-01-01T11:59:59.999Z', true],
    ['fim exato', '2030-01-01T12:00:00.000Z', true],
    ['após o fim', '2030-01-01T12:00:00.001Z', false],
  ] as const)('%s', async (_label, time, accepted) => {
    const operation = createOrder(fixture.user.id, { lotId: fixture.lot.id, quantity: 1 }, () => new Date(time));
    if (accepted) {
      expect((await operation).status).toBe('PENDING');
    } else {
      await expect(operation).rejects.toMatchObject({ statusCode: 422, code: 'LOT_OUT_OF_SALE_WINDOW' });
      expect(await prisma.order.count({ where: { userId: fixture.user.id } })).toBe(0);
    }
  });

  it('rejeita lote inativo mesmo dentro da janela', async () => {
    await prisma.ticketLot.update({ where: { id: fixture.lot.id }, data: { active: false } });
    await expect(createOrder(fixture.user.id, { lotId: fixture.lot.id, quantity: 1 }, () => start))
      .rejects.toMatchObject({ statusCode: 422, code: 'LOT_INACTIVE' });
  });
});
