import 'dotenv/config';
import { PrismaClient, Role, EventStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_PASSWORD || 'senha_desenvolvimento';
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const seedUsers = [
    {
      name: 'Admin',
      email: 'admin@eventbook.test',
      role: Role.ADMIN,
      passwordHash,
    },
    {
      name: 'Organizer',
      email: 'organizer@eventbook.test',
      role: Role.ORGANIZER,
      passwordHash,
    },
    {
      name: 'Staff',
      email: 'staff@eventbook.test',
      role: Role.STAFF,
      passwordHash,
    },
    {
      name: 'Buyer',
      email: 'buyer@eventbook.test',
      role: Role.BUYER,
      passwordHash,
    },
  ];

  await Promise.all(
    seedUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          passwordHash: user.passwordHash,
        },
        create: user,
      }),
    ),
  );

  const organizer = await prisma.user.findUnique({
    where: { email: 'organizer@eventbook.test' },
  });

  if (organizer) {
    const now = new Date();

    const seedEvents = [
      {
        title: 'Festival de Música de Verão',
        description: 'O maior festival de música com diversas bandas nacionais e internacionais.',
        location: 'Parque das Dunas - Fortaleza, CE',
        capacity: 5000,
        startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
      {
        title: 'Workshop de Arquitetura de Software',
        description: 'Imersão prática sobre Clean Architecture, DDD e boas práticas de engenharia.',
        location: 'Centro de Convenções - Fortaleza, CE',
        capacity: 200,
        startsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        status: EventStatus.DRAFT,
        organizerId: organizer.id,
      },
      {
        title: 'Meetup de Tecnologia e IA (Cancelado)',
        description: 'Discussão sobre novidades em inteligência artificial e computação em nuvem.',
        location: 'Auditório Hub Tech',
        capacity: 100,
        startsAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        status: EventStatus.CANCELLED,
        organizerId: organizer.id,
      },
      {
        title: 'Conferência Tech 2025 (Edição Passada)',
        description: 'Evento passado para demonstração de histórico e validação de regras de data.',
        location: 'Centro de Eventos',
        capacity: 800,
        startsAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
    ];

    const savedEvents = await Promise.all(
      seedEvents.map(async (eventData) => {
        const existing = await prisma.event.findFirst({
          where: {
            title: eventData.title,
            organizerId: organizer.id,
          },
        });

        if (existing) {
          return prisma.event.update({
            where: { id: existing.id },
            data: eventData,
          });
        }

        return prisma.event.create({
          data: eventData,
        });
      }),
    );

    const festivalEvent = savedEvents.find((e) => e.title === 'Festival de Música de Verão');
    const workshopEvent = savedEvents.find((e) => e.title === 'Workshop de Arquitetura de Software');

    if (festivalEvent) {
      const festivalLots = [
        {
          name: '1º Lote - Pista',
          price: 120.0,
          quantity: 2000,
          salesStartAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          salesEndAt: new Date(festivalEvent.endsAt),
          active: true,
          eventId: festivalEvent.id,
        },
        {
          name: '1º Lote - VIP Frontstage',
          price: 250.0,
          quantity: 500,
          salesStartAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          salesEndAt: new Date(festivalEvent.endsAt),
          active: true,
          eventId: festivalEvent.id,
        },
        {
          name: 'Lote Promocional Antecipado (Inativo)',
          price: 80.0,
          quantity: 200,
          salesStartAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          salesEndAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          active: false,
          eventId: festivalEvent.id,
        },
        {
          name: 'Lote Early Bird (Esgotado)',
          price: 90.0,
          quantity: 0,
          salesStartAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          salesEndAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          active: true,
          eventId: festivalEvent.id,
        },
      ];

      await Promise.all(
        festivalLots.map(async (lotData) => {
          const existingLot = await prisma.ticketLot.findFirst({
            where: {
              eventId: festivalEvent.id,
              name: lotData.name,
            },
          });

          if (existingLot) {
            return prisma.ticketLot.update({
              where: { id: existingLot.id },
              data: lotData,
            });
          }

          return prisma.ticketLot.create({
            data: lotData,
          });
        }),
      );
    }

    if (workshopEvent) {
      const workshopLots = [
        {
          name: 'Lote Único - Inscrição Geral',
          price: 150.0,
          quantity: 150,
          salesStartAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          salesEndAt: new Date(workshopEvent.endsAt),
          active: true,
          eventId: workshopEvent.id,
        },
      ];

      await Promise.all(
        workshopLots.map(async (lotData) => {
          const existingLot = await prisma.ticketLot.findFirst({
            where: {
              eventId: workshopEvent.id,
              name: lotData.name,
            },
          });

          if (existingLot) {
            return prisma.ticketLot.update({
              where: { id: existingLot.id },
              data: lotData,
            });
          }

          return prisma.ticketLot.create({
            data: lotData,
          });
        }),
      );
    }
  }

  console.log('Seed de usuários, eventos e lotes executado com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
