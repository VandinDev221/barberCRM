import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@barber.com' },
    update: {},
    create: {
      email: 'admin@barber.com',
      passwordHash: hashedPassword,
      name: 'Barbeiro Admin',
      phone: '+5511999999999',
      role: 'barber',
    },
  });

  // Serviços
  let services = await prisma.service.findMany({ where: { userId: user.id } });
  if (services.length === 0) {
    await prisma.service.createMany({
      data: [
        { userId: user.id, name: 'Corte de Cabelo', price: 35, duration: 30, category: 'Cabelo' },
        { userId: user.id, name: 'Barba', price: 25, duration: 20, category: 'Barba' },
        { userId: user.id, name: 'Corte + Barba', price: 55, duration: 50, category: 'Combo' },
        { userId: user.id, name: 'Sobrancelha', price: 15, duration: 15, category: 'Estética' },
      ],
    });
    services = await prisma.service.findMany({ where: { userId: user.id } });
  }

  const [servCorte, servBarba, servCombo, servSobrancelha] = services;

  // Settings fidelidade
  await prisma.setting.upsert({
    where: { userId_key: { userId: user.id, key: 'loyalty_points_per_visit' } },
    update: {},
    create: { userId: user.id, key: 'loyalty_points_per_visit', value: '10' },
  });
  await prisma.setting.upsert({
    where: { userId_key: { userId: user.id, key: 'loyalty_visit_goal' } },
    update: {},
    create: { userId: user.id, key: 'loyalty_visit_goal', value: '10' },
  });
  await prisma.setting.upsert({
    where: { userId_key: { userId: user.id, key: 'loyalty_discount_percent' } },
    update: {},
    create: { userId: user.id, key: 'loyalty_discount_percent', value: '10' },
  });

  const hasClients = (await prisma.client.count({ where: { userId: user.id } })) > 0;
  if (hasClients) {
    console.log('Seed já possui dados. Login: admin@barber.com / admin123');
    return;
  }

  // Clientes
  const clientsData = [
    { name: 'João Silva', phone: '11987654321', email: 'joao@email.com', isVip: true },
    { name: 'Maria Santos', phone: '11976543210', email: 'maria@email.com', isVip: false },
    { name: 'Pedro Oliveira', phone: '11965432109', isVip: false },
    { name: 'Ana Costa', phone: '11954321098', email: 'ana@email.com', isVip: true },
    { name: 'Carlos Souza', phone: '11943210987', isVip: false },
    { name: 'Fernanda Lima', phone: '11932109876', isVip: false },
    { name: 'Ricardo Pereira', phone: '11921098765', isVip: true },
    { name: 'Juliana Alves', phone: '11910987654', isVip: false },
    { name: 'Lucas Martins', phone: '11899876543', isVip: false },
    { name: 'Patricia Rocha', phone: '11888765432', email: 'patricia@email.com', isVip: false },
  ];

  const clients = await Promise.all(
    clientsData.map((c) =>
      prisma.client.create({
        data: {
          userId: user.id,
          name: c.name,
          phone: c.phone,
          email: c.email ?? null,
          isVip: c.isVip ?? false,
        },
      })
    )
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Agendamentos passados (concluídos) + pagamentos
  const methods = ['pix', 'cash', 'card'] as const;
  for (let i = 0; i < 15; i++) {
    const client = clients[i % clients.length];
    const dayOffset = -14 + i;
    const startAt = addDays(today, dayOffset);
    startAt.setHours(9 + (i % 6), (i % 2) * 30, 0, 0);
    const endAt = addMinutes(startAt, 30);
    const apt = await prisma.appointment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        startAt,
        endAt,
        status: 'completed',
        services: {
          create: [
            { serviceId: servCorte.id, price: servCorte.price },
          ],
        },
      },
      include: { services: true },
    });
    const total = apt.services.reduce((s, x) => s + Number(x.price), 0);
    await prisma.payment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        appointmentId: apt.id,
        amount: total,
        method: methods[i % 3],
        paidAt: startAt,
      },
    });
  }

  // Atualizar clientes com lastVisitAt, totalSpent, visitCount
  for (const client of clients) {
    const payments = await prisma.payment.findMany({
      where: { clientId: client.id },
      orderBy: { paidAt: 'desc' },
    });
    const totalSpent = payments.reduce((s, p) => s + Number(p.amount), 0);
    const lastPayment = payments[0];
    await prisma.client.update({
      where: { id: client.id },
      data: {
        totalSpent,
        visitCount: payments.length,
        lastVisitAt: lastPayment?.paidAt ?? null,
      },
    });
  }

  // Fidelidade para clientes com visitas
  for (const client of clients) {
    const count = await prisma.payment.count({ where: { clientId: client.id } });
    if (count > 0) {
      await prisma.loyaltyAccount.upsert({
        where: { clientId: client.id },
        create: {
          clientId: client.id,
          points: count * 10,
          visitsCount: count,
          lastEarnAt: new Date(),
        },
        update: {
          points: count * 10,
          visitsCount: count,
          lastEarnAt: new Date(),
        },
      });
    }
  }

  // Agendamentos hoje e futuros
  const tomorrow = addDays(today, 1);
  const clientsForApt = [clients[0], clients[1], clients[3], clients[4]];
  const startsToday = [
    [10, 0],
    [11, 0],
    [14, 30],
    [16, 0],
  ];
  for (let i = 0; i < 4; i++) {
    const startAt = new Date(today);
    startAt.setHours(startsToday[i][0], startsToday[i][1], 0, 0);
    const endAt = addMinutes(startAt, 30);
    await prisma.appointment.create({
      data: {
        userId: user.id,
        clientId: clientsForApt[i].id,
        startAt,
        endAt,
        status: i === 0 ? 'confirmed' : 'scheduled',
        services: {
          create: [{ serviceId: servCorte.id, price: servCorte.price }],
        },
      },
    });
  }

  const startTomorrow = new Date(tomorrow);
  startTomorrow.setHours(9, 0, 0, 0);
  const endTomorrow = addMinutes(startTomorrow, 50);
  await prisma.appointment.create({
    data: {
      userId: user.id,
      clientId: clients[2].id,
      startAt: startTomorrow,
      endAt: endTomorrow,
      status: 'scheduled',
      services: {
        create: [{ serviceId: servCombo.id, price: servCombo.price }],
      },
    },
  });

  // Estoque
  await prisma.inventoryItem.createMany({
    data: [
      { userId: user.id, name: 'Shampoo', quantity: 12, minQuantity: 3, unit: 'un' },
      { userId: user.id, name: 'Gel para cabelo', quantity: 8, minQuantity: 2, unit: 'un' },
      { userId: user.id, name: 'Lâminas', quantity: 50, minQuantity: 20, unit: 'un' },
      { userId: user.id, name: 'Espuma de barbear', quantity: 1, minQuantity: 2, unit: 'un' },
      { userId: user.id, name: 'Toalhas descartáveis', quantity: 100, minQuantity: 30, unit: 'un' },
    ],
  });

  console.log('Seed concluído com dados de demonstração.');
  console.log('Login: admin@barber.com / admin123');
  console.log('- 10 clientes, 15 atendimentos passados, 5 agendamentos (hoje/amanhã), estoque com 5 itens.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
