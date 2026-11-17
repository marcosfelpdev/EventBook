import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { eventsRouter } from '../src/routes/events.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const event = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  event,
  $queryRaw: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const app = express();
app.use(express.json());
app.use(eventsRouter);
app.use(errorHandler);

const organizerToken = jwt.sign({ sub: '10', role: 'ORGANIZER' }, env.JWT_SECRET);
const otherOrganizerToken = jwt.sign({ sub: '99', role: 'ORGANIZER' }, env.JWT_SECRET);
const adminToken = jwt.sign({ sub: '1', role: 'ADMIN' }, env.JWT_SECRET);
const buyerToken = jwt.sign({ sub: '50', role: 'BUYER' }, env.JWT_SECRET);

describe('RN-10: Ocupação de Eventos (GET /events/:id/occupancy)', () => {
  const mockEvent = {
    id: 1,
    title: 'Festival da Primavera',
    capacity: 200,
    organizerId: 10,
  };

  const mockLotsRaw = [
    {
      lotId: 1,
      lotName: 'Pista',
      price: '50.00',
      quantity: 100,
      soldTickets: 40,
      checkedInTickets: 25,
    },
    {
      lotId: 2,
      lotName: 'Camarote',
      price: '120.00',
      quantity: 50,
      soldTickets: 20,
      checkedInTickets: 15,
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    event.findUnique.mockResolvedValue(mockEvent);
    prismaMock.$queryRaw.mockResolvedValue(mockLotsRaw);
  });

  it('retorna totais agregados e estatísticas por lote para o organizador dono', async () => {
    const res = await request(app)
      .get('/events/1/occupancy')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      eventId: 1,
      title: 'Festival da Primavera',
      capacity: 200,
      totalLotsQuantity: 150,
      soldTickets: 60,
      checkedInTickets: 40,
      totalRevenue: '4400.00',
      occupancyRate: 30, // (60 / 200) * 100
      checkinRate: 66.67, // (40 / 60) * 100
      lots: [
        {
          lotId: 1,
          lotName: 'Pista',
          price: '50.00',
          quantity: 100,
          sold: 40,
          checkedIn: 25,
          available: 60,
          occupancyRate: 40,
        },
        {
          lotId: 2,
          lotName: 'Camarote',
          price: '120.00',
          quantity: 50,
          sold: 20,
          checkedIn: 15,
          available: 30,
          occupancyRate: 40,
        },
      ],
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('permite acesso a administradores mesmo não sendo donos', async () => {
    const res = await request(app)
      .get('/events/1/occupancy')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.eventId).toBe(1);
  });

  it('rejeita acesso de outro organizador com 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/events/1/occupancy')
      .set('Authorization', `Bearer ${otherOrganizerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it('rejeita acesso de usuário BUYER com 403', async () => {
    const res = await request(app)
      .get('/events/1/occupancy')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(403);
  });

  it('exige autenticação com 401', async () => {
    const res = await request(app).get('/events/1/occupancy');
    expect(res.status).toBe(401);
  });

  it('retorna 404 quando o evento não existe', async () => {
    event.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/events/999/occupancy')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });
});
