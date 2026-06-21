import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SERVICES = [
  { name: 'Corte de Cabelo', price: 35, duration: 30, category: 'Cabelo' },
  { name: 'Barba', price: 25, duration: 20, category: 'Barba' },
  { name: 'Corte + Barba', price: 55, duration: 50, category: 'Combo' },
];

const DEFAULT_SETTINGS = [
  { key: 'loyalty_points_per_visit', value: '10' },
  { key: 'loyalty_visit_goal', value: '10' },
  { key: 'loyalty_discount_percent', value: '10' },
];

export async function seedDefaultBarberData(prisma: PrismaService, userId: string): Promise<void> {
  const serviceCount = await prisma.service.count({ where: { userId } });
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: DEFAULT_SERVICES.map((s) => ({ ...s, userId })),
    });
  }

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { userId_key: { userId, key: setting.key } },
      update: {},
      create: { userId, key: setting.key, value: setting.value },
    });
  }
}
