import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { lotsRouter } from '../src/routes/lots.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    ticketLot: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const testApp = express();
testApp.use(express.json());
testApp.use(lotsRouter);
testApp.use(errorHandler);

describe('Testes de integração de lotes (M04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseEvent = {
    id: 1,
    title: 'Festival Tech',
    organizerId: 10,
    capacity: 1000,
    startsAt: new Date(Date.now() + 7 * 86400000),
    endsAt: new Date(Date.now() + 8 * 86400000),
    lots: [],
  };

  describe('GET /events/:id/lots (Listagem de lotes)', () => {
    it('retorna 404 se o evento não for encontrado', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const res = await request(testApp).get('/events/999/lots');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('retorna apenas lotes ativos para requisição anônima (pública)', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(baseEvent as never);

      const mockActiveLots = [
        { id: 1, name: 'Lote 1', price: 100, quantity: 200, active: true },
      ];
      vi.mocked(prisma.ticketLot.findMany).mockResolvedValue(mockActiveLots as never);

      const res = await request(testApp).get('/events/1/lots');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(prisma.ticketLot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 1, active: true },
        }),
      );
    });

    it('retorna todos os lotes (ativos e inativos) quando consultado pelo organizador dono', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(baseEvent as never);

      const mockAllLots = [
        { id: 1, name: 'Lote Ativo', price: 100, quantity: 200, active: true },
        { id: 2, name: 'Lote Inativo', price: 80, quantity: 50, active: false },
      ];
      vi.mocked(prisma.ticketLot.findMany).mockResolvedValue(mockAllLots as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .get('/events/1/lots')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(prisma.ticketLot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 1 },
        }),
      );
    });
  });

  describe('POST /events/:id/lots (Criação de lote)', () => {
    const validLotPayload = {
      name: '1º Lote Pista',
      price: 150.0,
      quantity: 400,
      salesStartAt: new Date(Date.now() + 86400000).toISOString(),
      salesEndAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      active: true,
    };

    it('retorna 401 se a requisição não for autenticada', async () => {
      const res = await request(testApp).post('/events/1/lots').send(validLotPayload);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('retorna 403 se o usuário não for o dono do evento', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(baseEvent as never);

      const notOwnerToken = jwt.sign({ sub: '99', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .post('/events/1/lots')
        .set('Authorization', `Bearer ${notOwnerToken}`)
        .send(validLotPayload);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('retorna 422 se a data de término das vendas for posterior ao término do evento', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(baseEvent as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);

      // Event ends at now + 8 days. Lot salesEndAt at now + 9 days:
      const payloadExceedingEventEnd = {
        ...validLotPayload,
        salesEndAt: new Date(Date.now() + 9 * 86400000).toISOString(),
      };

      const res = await request(testApp)
        .post('/events/1/lots')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(payloadExceedingEventEnd);

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INVALID_SALE_WINDOW');
    });

    it('retorna 422 se a soma da quantidade dos lotes exceder a capacidade do evento', async () => {
      // Event capacity is 1000, and already has a lot with 700
      const eventWithLots = {
        ...baseEvent,
        lots: [{ id: 1, quantity: 700 }],
      };
      vi.mocked(prisma.event.findUnique).mockResolvedValue(eventWithLots as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);

      // Adding 400 will make 700 + 400 = 1100 > 1000
      const res = await request(testApp)
        .post('/events/1/lots')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validLotPayload);

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('LOT_CAPACITY_EXCEEDED');
    });

    it('cria o lote com sucesso e retorna 201 quando válido', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...baseEvent,
        lots: [{ id: 1, quantity: 200 }],
      } as never);

      const createdLot = {
        id: 2,
        eventId: 1,
        ...validLotPayload,
        createdAt: new Date(),
      };
      vi.mocked(prisma.ticketLot.create).mockResolvedValue(createdLot as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .post('/events/1/lots')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validLotPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(2);
      expect(res.body.name).toBe('1º Lote Pista');
      expect(res.body.quantity).toBe(400);
    });
  });

  describe('PATCH /events/:id/lots/:lotId (Edição de lote)', () => {
    const existingLot = {
      id: 5,
      eventId: 1,
      name: 'Lote Original',
      price: 100,
      quantity: 300,
      salesStartAt: new Date(Date.now() + 86400000),
      salesEndAt: new Date(Date.now() + 4 * 86400000),
      active: true,
    };

    it('retorna 404 se o lote não existir ou não pertencer ao evento', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...baseEvent,
        lots: [existingLot],
      } as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .patch('/events/1/lots/999')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Novo Nome' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('LOT_NOT_FOUND');
    });

    it('retorna 422 se o aumento de quantidade do lote exceder a capacidade do evento', async () => {
      // Event capacity is 1000. Existing lot is 300, other lot is 600 (total 900).
      const otherLot = { id: 6, eventId: 1, quantity: 600 };
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...baseEvent,
        lots: [existingLot, otherLot],
      } as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);

      // Changing existingLot from 300 to 500 would make 600 + 500 = 1100 > 1000
      const res = await request(testApp)
        .patch('/events/1/lots/5')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ quantity: 500 });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('LOT_CAPACITY_EXCEEDED');
    });

    it('atualiza o lote com sucesso e retorna 200 quando válido', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...baseEvent,
        lots: [existingLot],
      } as never);

      const updatedLot = {
        ...existingLot,
        name: 'Lote Atualizado',
        price: 120,
        active: false,
      };
      vi.mocked(prisma.ticketLot.update).mockResolvedValue(updatedLot as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .patch('/events/1/lots/5')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Lote Atualizado', price: 120, active: false });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Lote Atualizado');
      expect(res.body.active).toBe(false);
    });
  });
});
