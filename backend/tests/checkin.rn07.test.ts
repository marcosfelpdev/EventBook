import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { checkinRouter } from '../src/routes/checkin.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const ticket = {
  id: 10,
  code: 'TICKET-ABC-123',
  status: 'VALID' as const,
  eventId: 1,
  orderId: 100,
  lotId: 5,
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  usedAt: null,
};

// Evento em 1º de dezembro de 2026, das 18h às 22h UTC.
// Janela de check-in: 16h às 22h UTC. Usamos 20h (dentro da janela).
const event = {
  id: 1,
  title: 'Evento Teste Check-in',
  startsAt: new Date('2026-12-01T18:00:00.000Z'),
  endsAt: new Date('2026-12-01T22:00:00.000Z'),
};

const nowInWindow = new Date('2026-12-01T20:00:00.000Z');

const staffUser = {
  id: 42,
  name: 'Staff Teste',
  email: 'staff@eventbook.test',
  role: 'STAFF' as const,
};

const tx = vi.hoisted(() => ({
  ticket: { findUnique: vi.fn(), update: vi.fn() },
  eventStaff: { findFirst: vi.fn() },
  checkin: { create: vi.fn() },
}));
const transaction = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/prisma.js', () => ({ prisma: { $transaction: transaction } }));

const app = express();
app.use(express.json());
app.use(checkinRouter);
app.use(errorHandler);

const staffToken = jwt.sign({ sub: String(staffUser.id), role: staffUser.role }, env.JWT_SECRET);
const buyerToken = jwt.sign({ sub: '99', role: 'BUYER' }, env.JWT_SECRET);

const postCheckin = (code: string) =>
  request(app).post(`/tickets/${code}/checkin`).set('Authorization', `Bearer ${staffToken}`);

// Mock global Date para todas as chamadas de new Date() retornarem nowInWindow
const RealDate = global.Date;
class MockDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      return new RealDate(nowInWindow);
    }
    return new RealDate(...(args as []));
  }
  static now = () => nowInWindow.getTime();
  static parse = RealDate.parse;
  static UTC = RealDate.UTC;
}

describe('RN-07: Validade do check-in', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.Date = MockDate as unknown as typeof Date;
    transaction.mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));
    tx.ticket.findUnique.mockResolvedValue({ ...ticket, event });
    tx.eventStaff.findFirst.mockResolvedValue({ id: 1, eventId: 1, userId: staffUser.id });
    tx.ticket.update.mockResolvedValue({ ...ticket, status: 'USED', usedAt: nowInWindow });
    tx.checkin.create.mockResolvedValue({
      id: 1,
      ticketId: ticket.id,
      staffId: staffUser.id,
      checkedInAt: nowInWindow,
      staff: { id: staffUser.id, name: staffUser.name, email: staffUser.email },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.Date = RealDate;
  });

  it('aceita check-in de ticket válido, pertencente ao evento e staff vinculado', async () => {
    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(200);
    expect(response.body.ticket.status).toBe('USED');
    expect(response.body.checkin.staff.id).toBe(staffUser.id);
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: ticket.id },
      data: { status: 'USED', usedAt: expect.anything() },
    });
    expect(tx.checkin.create).toHaveBeenCalledWith({
      data: { ticketId: ticket.id, staffId: staffUser.id, checkedInAt: expect.anything() },
      include: { staff: { select: { id: true, name: true, email: true } } },
    });
  });

  it('retorna 404 quando o código do ingresso não existe', async () => {
    tx.ticket.findUnique.mockResolvedValue(null);
    const response = await postCheckin('INEXISTENTE');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('TICKET_NOT_FOUND');
  });

  it('retorna 403 quando o staff não está vinculado ao evento do ticket', async () => {
    tx.eventStaff.findFirst.mockResolvedValue(null);
    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('retorna 422 quando o ticket está cancelado', async () => {
    tx.ticket.findUnique.mockResolvedValue({
      ...ticket,
      status: 'CANCELLED' as const,
      event,
    });
    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('TICKET_INVALID');
  });

  it('retorna 409 quando o ticket já foi usado', async () => {
    tx.ticket.findUnique.mockResolvedValue({ ...ticket, status: 'USED' as const, event });
    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('TICKET_ALREADY_USED');
  });

  it('exige autenticação', async () => {
    expect((await request(app).post(`/tickets/${ticket.code}/checkin`)).status).toBe(401);
  });

  it('exige perfil STAFF (BUYER não pode fazer check-in)', async () => {
    const response = await request(app)
      .post(`/tickets/${ticket.code}/checkin`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });
});
