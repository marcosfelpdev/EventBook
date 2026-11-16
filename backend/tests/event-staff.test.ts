import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { eventStaffRouter } from '../src/routes/event-staff.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const organizerUser = {
  id: 10,
  name: 'Organizador',
  email: 'organizador@test.com',
  role: 'ORGANIZER' as const,
};
const staffUser = {
  id: 20,
  name: 'Staff',
  email: 'staff@test.com',
  role: 'STAFF' as const,
};
const buyerUser = {
  id: 30,
  name: 'Comprador',
  email: 'buyer@test.com',
  role: 'BUYER' as const,
};

const event = {
  id: 1,
  title: 'Evento Teste Staff',
  organizerId: organizerUser.id,
};

const prismaMock = vi.hoisted(() => ({
  event: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  eventStaff: { create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
}));

vi.mock('../src/lib/prisma.js', () => ({ prisma: prismaMock }));

const app = express();
app.use(express.json());
app.use(eventStaffRouter);
app.use(errorHandler);

const organizerToken = jwt.sign(
  { sub: String(organizerUser.id), role: organizerUser.role },
  env.JWT_SECRET,
);
const staffToken = jwt.sign(
  { sub: String(staffUser.id), role: staffUser.role },
  env.JWT_SECRET,
);
const buyerToken = jwt.sign({ sub: String(buyerUser.id), role: buyerUser.role }, env.JWT_SECRET);

describe('EventStaff: gerenciamento de equipe do evento', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('organizador dono adiciona staff ao evento', async () => {
    prismaMock.event.findUnique.mockResolvedValue(event);
    prismaMock.user.findUnique.mockResolvedValue(staffUser);
    prismaMock.eventStaff.create.mockResolvedValue({
      id: 1,
      eventId: 1,
      userId: staffUser.id,
      user: { id: staffUser.id, name: staffUser.name, email: staffUser.email },
    });

    const response = await request(app)
      .post('/events/1/staff')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ userId: staffUser.id });

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(staffUser.id);
    expect(prismaMock.eventStaff.create).toHaveBeenCalledWith({
      data: { eventId: 1, userId: staffUser.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  });

  it('organizador não-dono recebe 403', async () => {
    // evento pertence ao organizador 10, mas o token é do usuário 999
    prismaMock.event.findUnique.mockResolvedValue(event);
    prismaMock.user.findUnique.mockResolvedValue(staffUser);
    const otherOrganizer = { ...organizerUser, id: 999 };
    const token = jwt.sign(
      { sub: String(otherOrganizer.id), role: otherOrganizer.role },
      env.JWT_SECRET,
    );

    const response = await request(app)
      .post('/events/1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: staffUser.id });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('staff não pode adicionar equipe (apenas organizador/admin)', async () => {
    prismaMock.event.findUnique.mockResolvedValue(event);
    prismaMock.user.findUnique.mockResolvedValue(staffUser);
    const response = await request(app)
      .post('/events/1/staff')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ userId: staffUser.id });

    expect(response.status).toBe(403);
  });

  it('comprador não pode adicionar equipe', async () => {
    prismaMock.event.findUnique.mockResolvedValue(event);
    const response = await request(app)
      .post('/events/1/staff')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ userId: staffUser.id });

    expect(response.status).toBe(403);
  });

  it('adicionar usuário sem perfil STAFF retorna 422', async () => {
    prismaMock.event.findUnique.mockResolvedValue(event);
    prismaMock.user.findUnique.mockResolvedValue(buyerUser);
    const response = await request(app)
      .post('/events/1/staff')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ userId: buyerUser.id });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('INVALID_ROLE');
  });

  it('listar equipe do evento', async () => {
    prismaMock.event.findUnique.mockResolvedValue(event);
    prismaMock.eventStaff.findMany.mockResolvedValue([
      {
        id: 1,
        eventId: 1,
        userId: staffUser.id,
        user: { id: staffUser.id, name: staffUser.name, email: staffUser.email },
      },
    ]);

    const response = await request(app)
      .get('/events/1/staff')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].user.name).toBe(staffUser.name);
  });

  it('remover staff do evento', async () => {
    prismaMock.event.findUnique.mockResolvedValue(event);
    prismaMock.eventStaff.delete.mockResolvedValue({
      id: 1,
      user: { id: staffUser.id, name: staffUser.name, email: staffUser.email },
    });

    const response = await request(app)
      .delete('/events/1/staff/20')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(staffUser.id);
    expect(prismaMock.eventStaff.delete).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: 1, userId: 20 } },
      select: { id: true, user: { select: { id: true, name: true, email: true } } },
    });
  });

  it('evento inexistente retorna 404', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    const response = await request(app)
      .post('/events/999/staff')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ userId: staffUser.id });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('exige autenticação', async () => {
    expect((await request(app).get('/events/1/staff')).status).toBe(401);
  });
});
