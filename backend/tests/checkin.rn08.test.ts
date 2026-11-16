import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { checkinRouter } from '../src/routes/checkin.route.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import { env } from '../src/config/env.js';

const ticket = {
  id: 10,
  code: 'TICKET-WINDOW-001',
  status: 'VALID' as const,
  eventId: 1,
};

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
const postCheckin = (code: string) =>
  request(app).post(`/tickets/${code}/checkin`).set('Authorization', `Bearer ${staffToken}`);

describe('RN-08: Janela de check-in (starts_at - 2h até ends_at)', () => {
  const startsAt = new Date('2026-12-01T18:00:00.000Z');
  const endsAt = new Date('2026-12-01T22:00:00.000Z');
  const windowStart = new Date(startsAt.getTime() - 2 * 60 * 60 * 1000); // 16:00 UTC

  const RealDate = global.Date;
  class MockDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        return new RealDate(now);
      }
      return new RealDate(...(args as []));
    }
    static now = () => now.getTime();
    static parse = RealDate.parse;
    static UTC = RealDate.UTC;
  }

  let now: Date;

  beforeEach(() => {
    vi.resetAllMocks();
    transaction.mockImplementation((fn: unknown) => fn(tx));
    tx.eventStaff.findFirst.mockResolvedValue({ id: 1, eventId: 1, userId: staffUser.id });
    tx.ticket.update.mockResolvedValue({ ...ticket, status: 'USED', usedAt: now });
    tx.checkin.create.mockResolvedValue({
      id: 1,
      ticketId: ticket.id,
      staffId: staffUser.id,
      checkedInAt: now,
      staff: { id: staffUser.id, name: staffUser.name, email: staffUser.email },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.Date = RealDate;
  });

  function ticketAtEvent(eventStartsAt: Date, eventEndsAt: Date) {
    return { ...ticket, event: { id: 1, startsAt: eventStartsAt, endsAt: eventEndsAt } };
  }

  function setNow(date: Date) {
    now = date;
    global.Date = MockDate as unknown as typeof Date;
  }

  it('aceita na abertura exata da janela (starts_at - 2h)', async () => {
    setNow(windowStart);
    tx.ticket.findUnique.mockResolvedValue(ticketAtEvent(startsAt, endsAt));

    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(200);
  });

  it('aceita dentro da janela', async () => {
    setNow(new Date('2026-12-01T20:00:00.000Z'));
    tx.ticket.findUnique.mockResolvedValue(ticketAtEvent(startsAt, endsAt));

    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(200);
  });

  it('aceita no fim exato (ends_at)', async () => {
    setNow(endsAt);
    tx.ticket.findUnique.mockResolvedValue(ticketAtEvent(startsAt, endsAt));

    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(200);
  });

  it('rejeita antes da janela (starts_at - 2h - 1ms)', async () => {
    setNow(new Date(windowStart.getTime() - 1));
    tx.ticket.findUnique.mockResolvedValue(ticketAtEvent(startsAt, endsAt));

    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('CHECKIN_WINDOW_CLOSED');
  });

  it('rejeita após o fim (ends_at + 1ms)', async () => {
    setNow(new Date(endsAt.getTime() + 1));
    tx.ticket.findUnique.mockResolvedValue(ticketAtEvent(startsAt, endsAt));

    const response = await postCheckin(ticket.code);
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('CHECKIN_WINDOW_CLOSED');
  });
});
