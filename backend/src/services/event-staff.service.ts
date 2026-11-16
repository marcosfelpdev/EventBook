import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';

/**
 * Adiciona um membro da equipe (STAFF) a um evento.
 * Apenas o organizador dono do evento pode fazer isso.
 */
export async function addStaffToEvent(
  eventId: number,
  organizerId: number,
  userId: number,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Evento não encontrado.');
  }

  // Autorização por recurso: só o dono do evento gerencia a equipe
  if (event.organizerId !== organizerId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Somente o organizador dono do evento pode gerenciar a equipe.',
    );
  }

  // O usuário deve existir e ter perfil STAFF
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado.');
  }
  if (user.role !== 'STAFF') {
    throw new AppError(
      422,
      'INVALID_ROLE',
      'O usuário deve ter o perfil STAFF para integrar a equipe.',
    );
  }

  const eventStaff = await prisma.eventStaff.create({
    data: { eventId, userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return eventStaff;
}

/**
 * Remove um membro da equipe de um evento.
 * Apenas o organizador dono do evento pode fazer isso.
 */
export async function removeStaffFromEvent(
  eventId: number,
  organizerId: number,
  userId: number,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Evento não encontrado.');
  }

  if (event.organizerId !== organizerId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Somente o organizador dono do evento pode gerenciar a equipe.',
    );
  }

  const deleted = await prisma.eventStaff.delete({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true, user: { select: { id: true, name: true, email: true } } },
  });

  return deleted;
}

/**
 * Lista a equipe vinculada a um evento.
 * Apenas o organizador dono do evento pode ver.
 */
export async function listEventStaff(eventId: number, organizerId: number) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Evento não encontrado.');
  }

  if (event.organizerId !== organizerId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Somente o organizador dono do evento pode ver a equipe.',
    );
  }

  return prisma.eventStaff.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: 'asc' } },
  });
}
