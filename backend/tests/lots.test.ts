import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { EventStatus, Role } from '@prisma/client';
import { env } from '../src/config/env.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';

const { db } = vi.hoisted(() => {
  const database = {
    event: { findUnique: vi.fn() },
    ticketLot: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  database.$transaction.mockImplementation((callback: (tx: typeof database) => Promise<unknown>) =>
    callback(database),
  );
  return { db: database };
});

vi.mock('../src/lib/prisma.js', () => ({ prisma: db }));

import { lotsRouter } from '../src/lots/lots.route.js';

const app = express();
app.use(express.json());
app.use(lotsRouter);
app.use(errorHandler);

const eventFixture = {
  id: 1,
  organizerId: 7,
  capacity: 100,
  startsAt: new Date('2027-01-01T18:00:00.000Z'),
  endsAt: new Date('2027-01-01T23:00:00.000Z'),
  status: EventStatus.PUBLISHED,
};

const lotFixture = {
  id: 4,
  eventId: 1,
  name: 'Pista',
  price: '50.00',
  quantity: 40,
  salesStartAt: new Date('2027-01-01T18:00:00.000Z'),
  salesEndAt: new Date('2027-01-01T22:00:00.000Z'),
  active: true,
};

function organizerToken(id = 7) {
  return jwt.sign({ sub: String(id), role: Role.ORGANIZER }, env.JWT_SECRET);
}

describe('API de lotes de eventos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista somente lotes ativos para acesso público', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue(eventFixture);
    vi.mocked(db.ticketLot.findMany).mockResolvedValue([lotFixture]);

    const response = await request(app).get('/events/1/lots');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(db.ticketLot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 1, active: true } }),
    );
  });

  it('permite ao organizador dono listar também os lotes inativos de um rascunho', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue({
      ...eventFixture,
      status: EventStatus.DRAFT,
    });
    vi.mocked(db.ticketLot.findMany).mockResolvedValue([
      lotFixture,
      { ...lotFixture, id: 5, active: false },
    ]);

    const response = await request(app)
      .get('/events/1/lots')
      .set('Authorization', `Bearer ${organizerToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(db.ticketLot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 1 } }),
    );
  });

  it('rejeita edição que faria a soma dos lotes exceder a capacidade do evento', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue(eventFixture);
    vi.mocked(db.ticketLot.findFirst).mockResolvedValue(lotFixture);
    vi.mocked(db.ticketLot.aggregate).mockResolvedValue({ _sum: { quantity: 60 } });

    const response = await request(app)
      .patch('/events/1/lots/4')
      .set('Authorization', `Bearer ${organizerToken()}`)
      .send({ quantity: 50 });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('EVENT_CAPACITY_EXCEEDED');
    expect(db.ticketLot.update).not.toHaveBeenCalled();
  });

  it('atualiza o lote do organizador quando respeita a capacidade', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue(eventFixture);
    vi.mocked(db.ticketLot.findFirst).mockResolvedValue(lotFixture);
    vi.mocked(db.ticketLot.aggregate).mockResolvedValue({ _sum: { quantity: 20 } });
    vi.mocked(db.ticketLot.update).mockResolvedValue({ ...lotFixture, quantity: 50 });

    const response = await request(app)
      .patch('/events/1/lots/4')
      .set('Authorization', Bearer)
      .send({ quantity: 50 });

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(50);
    expect(db.ticketLot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4 },
        data: expect.objectContaining({ quantity: 50 }),
      }),
    );
  });
  it('rejeita que um não proprietário edite os lotes', async () => {
    vi.mocked(db.event.findUnique).mockResolvedValue(eventFixture);

    const response = await request(app)
      .patch('/events/1/lots/4')
      .set('Authorization', `Bearer ${organizerToken(8)}`)
      .send({ active: false });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(db.ticketLot.findFirst).not.toHaveBeenCalled();
  });
});
