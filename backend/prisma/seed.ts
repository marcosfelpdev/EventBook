import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
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

  console.log('Seed de usuários executado com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
