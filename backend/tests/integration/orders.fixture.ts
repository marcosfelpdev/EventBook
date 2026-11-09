import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma.js';
import { env } from '../../src/config/env.js';

export async function createOrderFixture(quantity = 5) {
  const user = await prisma.user.create({
    data: { name: 'Comprador de teste M05', email: `m05-${randomUUID()}@example.test`, passwordHash: 'nao-utilizado', role: 'BUYER' },
  });
  const event = await prisma.event.create({
    data: {
      organizerId: user.id, title: 'Evento teste M05', description: 'Fixture isolada', location: 'Teste',
      capacity: quantity, startsAt: new Date(Date.now() + 86400000), endsAt: new Date(Date.now() + 172800000), status: 'PUBLISHED',
    },
  });
  const lot = await prisma.ticketLot.create({
    data: {
      eventId: event.id, name: 'Lote de teste', price: '19.90', quantity,
      salesStartAt: new Date(Date.now() - 86400000), salesEndAt: new Date(Date.now() + 86400000),
    },
  });
  return { user, event, lot, token: jwt.sign({ sub: String(user.id), role: 'BUYER' }, env.JWT_SECRET) };
}

export async function removeOrderFixture(fixture: Awaited<ReturnType<typeof createOrderFixture>>) {
  await prisma.orderItem.deleteMany({ where: { order: { userId: fixture.user.id } } });
  await prisma.order.deleteMany({ where: { userId: fixture.user.id } });
  await prisma.ticketLot.deleteMany({ where: { eventId: fixture.event.id } });
  await prisma.event.delete({ where: { id: fixture.event.id } });
  await prisma.user.delete({ where: { id: fixture.user.id } });
}
