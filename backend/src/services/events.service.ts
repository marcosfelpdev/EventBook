import { EventStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';
import type {
  CreateEventInput,
  UpdateEventInput,
  ListEventsQueryInput,
} from '../schemas/events.schema.js';

interface RequestingUserContext {
  id?: number;
  role?: string;
}

export async function listEvents({ page = 1, pageSize = 20, search }: ListEventsQueryInput = { page: 1, pageSize: 20 }) {
  const skip = (page - 1) * pageSize;

  const whereClause = {
    status: EventStatus.PUBLISHED,
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { location: { contains: search } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.event.count({ where: whereClause }),
    prisma.event.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { startsAt: 'asc' },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lots: {
          where: { active: true },
          orderBy: { salesStartAt: 'asc' },
        },
      },
    }),
  ]);

  return {
    data,
    page,
    pageSize,
    total,
  };
}

export async function getEventById(eventId: number, userContext?: RequestingUserContext) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lots: {
        orderBy: { salesStartAt: 'asc' },
      },
    },
  });

  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  const isOwner = userContext?.id === event.organizerId;
  const isAdmin = userContext?.role === 'ADMIN';

  if (event.status !== EventStatus.PUBLISHED && !isOwner && !isAdmin) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  // Se for público (não dono nem admin), filtrar apenas os lotes ativos
  if (!isOwner && !isAdmin) {
    return {
      ...event,
      lots: event.lots.filter((lot) => lot.active),
    };
  }

  return event;
}

export async function createEvent(organizerId: number, input: CreateEventInput) {
  const event = await prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      location: input.location,
      capacity: input.capacity,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      status: EventStatus.DRAFT,
      organizerId,
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lots: true,
    },
  });

  return event;
}

export async function updateEvent(
  eventId: number,
  organizerId: number,
  input: UpdateEventInput,
  userRole?: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  const isOwner = event.organizerId === organizerId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para editar este evento.');
  }

  // RN-01: Bloquear edição de evento no passado
  const now = new Date();
  if (new Date(event.startsAt) < now) {
    throw new AppError(
      422,
      'EVENT_ALREADY_STARTED',
      'Não é possível editar eventos que já iniciaram ou ocorreram no passado.',
    );
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.startsAt !== undefined && { startsAt: new Date(input.startsAt) }),
      ...(input.endsAt !== undefined && { endsAt: new Date(input.endsAt) }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lots: true,
    },
  });

  return updatedEvent;
}

export async function publishEvent(
  eventId: number,
  organizerId: number,
  userRole?: string,
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { lots: true },
  });

  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento não encontrado.');
  }

  const isOwner = event.organizerId === organizerId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para publicar este evento.');
  }

  // RN-01: Bloquear publicação de evento no passado
  const now = new Date();
  if (new Date(event.startsAt) < now) {
    throw new AppError(
      422,
      'EVENT_IN_PAST',
      'Não é possível publicar eventos que já iniciaram ou ocorreram no passado.',
    );
  }

  // RN-01: Bloquear publicação sem lotes
  if (!event.lots || event.lots.length === 0) {
    throw new AppError(
      422,
      'EVENT_WITHOUT_LOTS',
      'Um evento sem lotes não pode ser publicado.',
    );
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: EventStatus.PUBLISHED,
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lots: true,
    },
  });

  return updated;
}
