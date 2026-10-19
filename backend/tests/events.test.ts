import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Role, EventStatus } from '@prisma/client';
import { eventsRouter } from '../src/routes/events.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    event: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const testApp = express();
testApp.use(express.json());
testApp.use(eventsRouter);
testApp.use(errorHandler);

describe('Testes de integração de eventos (M03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /events (Listagem pública e paginação)', () => {
    it('retorna eventos publicados com formato paginado', async () => {
      const mockEvents = [
        {
          id: 1,
          title: 'Festival de Música',
          description: 'Descrição do festival',
          location: 'Parque Central',
          capacity: 1000,
          startsAt: new Date(Date.now() + 86400000),
          endsAt: new Date(Date.now() + 172800000),
          status: EventStatus.PUBLISHED,
          organizerId: 1,
          organizer: { id: 1, name: 'Organizador', email: 'org@teste.com' },
        },
      ];

      vi.mocked(prisma.event.count).mockResolvedValue(1);
      vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents as never);

      const res = await request(testApp).get('/events?page=1&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(10);
      expect(res.body.total).toBe(1);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /events/:id (Detalhe do evento)', () => {
    it('retorna 200 e os dados para evento publicado', async () => {
      const mockEvent = {
        id: 1,
        title: 'Festival de Música',
        description: 'Descrição completa',
        location: 'Parque Central',
        capacity: 1000,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 172800000),
        status: EventStatus.PUBLISHED,
        organizerId: 1,
        organizer: { id: 1, name: 'Organizador', email: 'org@teste.com' },
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);

      const res = await request(testApp).get('/events/1');

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Festival de Música');
    });

    it('retorna 404 para evento inexistente', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const res = await request(testApp).get('/events/999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('retorna 404 para evento em DRAFT se o usuário não for o dono', async () => {
      const mockEvent = {
        id: 2,
        title: 'Evento Rascunho',
        description: 'Descrição rascunho',
        location: 'Local',
        capacity: 50,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 172800000),
        status: EventStatus.DRAFT,
        organizerId: 10,
        organizer: { id: 10, name: 'Outro', email: 'outro@teste.com' },
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);

      // Usuário anônimo
      const resAnon = await request(testApp).get('/events/2');
      expect(resAnon.status).toBe(404);

      // Usuário autenticado que NÃO é o dono
      const buyerToken = jwt.sign({ sub: '5', role: Role.BUYER }, env.JWT_SECRET);
      const resBuyer = await request(testApp)
        .get('/events/2')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(resBuyer.status).toBe(404);
    });

    it('retorna 200 para evento em DRAFT quando consultado pelo organizador dono', async () => {
      const mockEvent = {
        id: 2,
        title: 'Evento Rascunho',
        description: 'Descrição rascunho',
        location: 'Local',
        capacity: 50,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 172800000),
        status: EventStatus.DRAFT,
        organizerId: 10,
        organizer: { id: 10, name: 'Dono', email: 'dono@teste.com' },
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);

      const ownerToken = jwt.sign({ sub: '10', role: Role.ORGANIZER }, env.JWT_SECRET);
      const res = await request(testApp)
        .get('/events/2')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Evento Rascunho');
    });
  });

  describe('POST /events (Criação de evento)', () => {
    const validFuturePayload = {
      title: 'Novo Congresso',
      description: 'Descrição completa do novo congresso com detalhes.',
      location: 'Auditório Principal',
      capacity: 300,
      startsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      endsAt: new Date(Date.now() + 6 * 86400000).toISOString(),
    };

    it('retorna 401 ao tentar criar sem autenticação', async () => {
      const res = await request(testApp).post('/events').send(validFuturePayload);
      expect(res.status).toBe(401);
    });

    it('retorna 403 se o usuário não for ORGANIZER ou ADMIN', async () => {
      const buyerToken = jwt.sign({ sub: '1', role: Role.BUYER }, env.JWT_SECRET);
      const res = await request(testApp)
        .post('/events')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validFuturePayload);

      expect(res.status).toBe(403);
    });

    it('cria o evento como DRAFT com sucesso para ORGANIZER', async () => {
      const orgToken = jwt.sign({ sub: '2', role: Role.ORGANIZER }, env.JWT_SECRET);

      vi.mocked(prisma.event.create).mockResolvedValue({
        id: 5,
        ...validFuturePayload,
        startsAt: new Date(validFuturePayload.startsAt),
        endsAt: new Date(validFuturePayload.endsAt),
        status: EventStatus.DRAFT,
        organizerId: 2,
        createdAt: new Date(),
        organizer: { id: 2, name: 'Organizer', email: 'org@teste.com' },
      } as never);

      const res = await request(testApp)
        .post('/events')
        .set('Authorization', `Bearer ${orgToken}`)
        .send(validFuturePayload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.organizerId).toBe(2);
    });

    it('retorna 400 se as datas forem inconsistentes (início no passado ou término antes do início)', async () => {
      const orgToken = jwt.sign({ sub: '2', role: Role.ORGANIZER }, env.JWT_SECRET);

      // Data no passado
      const pastPayload = {
        ...validFuturePayload,
        startsAt: new Date(Date.now() - 86400000).toISOString(),
      };

      const resPast = await request(testApp)
        .post('/events')
        .set('Authorization', `Bearer ${orgToken}`)
        .send(pastPayload);

      expect(resPast.status).toBe(400);
      expect(resPast.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /events/:id e RN-01 (Edição de evento e regra de passado)', () => {
    it('retorna 403 se outro organizador tentar editar o evento (Ownership)', async () => {
      const existingEvent = {
        id: 10,
        title: 'Evento do Dono',
        description: 'Descrição do evento',
        location: 'Local',
        capacity: 100,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 172800000),
        status: EventStatus.DRAFT,
        organizerId: 1, // Dono é o id 1
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(existingEvent as never);

      const intruderToken = jwt.sign({ sub: '99', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .patch('/events/10')
        .set('Authorization', `Bearer ${intruderToken}`)
        .send({ title: 'Tentativa de Mudança' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('RN-01: bloqueia edição com 422 se o evento já ocorreu ou iniciou no passado', async () => {
      const pastEvent = {
        id: 12,
        title: 'Evento Passado',
        description: 'Descrição do evento antigo',
        location: 'Local Antigo',
        capacity: 100,
        startsAt: new Date(Date.now() - 86400000), // Iniciou no passado
        endsAt: new Date(Date.now() - 3600000),
        status: EventStatus.PUBLISHED,
        organizerId: 2,
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(pastEvent as never);

      const ownerToken = jwt.sign({ sub: '2', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .patch('/events/12')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Tentando mudar evento passado' });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('EVENT_ALREADY_STARTED');
    });

    it('permite a edição com 200 quando o dono edita um evento futuro válido', async () => {
      const futureEvent = {
        id: 15,
        title: 'Evento Futuro',
        description: 'Descrição original',
        location: 'Local',
        capacity: 100,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 172800000),
        status: EventStatus.DRAFT,
        organizerId: 2,
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(futureEvent as never);
      vi.mocked(prisma.event.update).mockResolvedValue({
        ...futureEvent,
        title: 'Título Atualizado com Sucesso',
        organizer: { id: 2, name: 'Dono', email: 'org@teste.com' },
      } as never);

      const ownerToken = jwt.sign({ sub: '2', role: Role.ORGANIZER }, env.JWT_SECRET);

      const res = await request(testApp)
        .patch('/events/15')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Título Atualizado com Sucesso' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Título Atualizado com Sucesso');
    });
  });
});
