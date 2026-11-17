import { prisma } from '../lib/prisma.js';

export async function listMyTickets(
  userId: number,
  { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {},
) {
  const skip = (page - 1) * pageSize;
  const where = {
    order: {
      userId,
    },
  };

  const [data, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        lot: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startsAt: true,
            endsAt: true,
            status: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            paidAt: true,
          },
        },
        checkin: {
          select: {
            id: true,
            checkedInAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  return { data, page, pageSize, total };
}
