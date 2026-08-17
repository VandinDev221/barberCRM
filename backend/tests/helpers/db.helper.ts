import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function truncateAll() {
  const tables = [
    'appointment_services',
    'Payment',
    'loyalty',
    'inventory',
    'Appointment',
    'Service',
    'Client',
    'settings',
    'User',
  ];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (err) {
      // Ignore if table doesn't exist
    }
  }
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

export function getPrismaClient() {
  return prisma;
}
