import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';
import { Prisma } from '@prisma/client';

const CHECKIN_WINDOW_HOURS_BEFORE_START = 2;

/**
 * Realiza o check-in de um ingresso.
 *
 * Regras de negócio aplicadas:
 * - RN-07: ticket deve existir, pertencer ao evento do staff, não estar cancelado e não ter sido usado.
 * - RN-08: check-in permitido entre starts_at - 2h e ends_at (limites inclusivos).
 * - Apenas staff vinculado ao evento pode realizar o check-in.
 * - A unicidade de checkins.ticket_id no banco impede check-in duplicado sob concorrência.
 */
export async function checkinTicket(
  code: string,
  staffId: number,
  clock: () => Date = () => new Date(),
) {
  return prisma.$transaction(
    async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { code },
        include: { event: true },
      });

      if (!ticket) {
        throw new AppError(404, 'TICKET_NOT_FOUND', 'Código de ingresso não encontrado.');
      }

      // RN-07: staff só pode fazer check-in em tickets do evento ao qual está vinculado
      const staffLink = await tx.eventStaff.findFirst({
        where: { eventId: ticket.eventId, userId: staffId },
      });
      if (!staffLink) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Você não é membro da equipe deste evento.',
        );
      }

      // RN-07: ticket cancelado?
      if (ticket.status === 'CANCELLED') {
        throw new AppError(422, 'TICKET_INVALID', 'Este ingresso está cancelado.');
      }

      // RN-07: ticket já usado?
      if (ticket.status === 'USED') {
        throw new AppError(409, 'TICKET_ALREADY_USED', 'Este ingresso já foi utilizado.');
      }

      const { event } = ticket;
      const startsAt = new Date(event.startsAt);
      const endsAt = new Date(event.endsAt);
      const windowStart = new Date(
        startsAt.getTime() - CHECKIN_WINDOW_HOURS_BEFORE_START * 60 * 60 * 1000,
      );
      const now = clock();

      // RN-08: janela de check-in
      if (now < windowStart || now > endsAt) {
        throw new AppError(
          422,
          'CHECKIN_WINDOW_CLOSED',
          'O check-in não está disponível neste horário.',
        );
      }

      // Marcar ticket como usado e criar checkin (atômico)
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED', usedAt: now },
      });

      const checkin = await tx.checkin.create({
        data: { ticketId: ticket.id, staffId, checkedInAt: now },
        include: {
          staff: { select: { id: true, name: true, email: true } },
        },
      });

      return { ticket: updatedTicket, checkin };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 15000,
    },
  );
}
