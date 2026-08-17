import { truncateAll, disconnectDb, getPrismaClient } from '../helpers/db.helper';

describe('Database Constraints & Cascade Tests', () => {
  const prisma = getPrismaClient();

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('should enforce unique email constraint on User', async () => {
    await prisma.user.create({
      data: {
        email: 'unique@barber.com',
        name: 'Barber 1',
        slug: 'barber-1',
      },
    });

    // Try to create another user with same email
    await expect(
      prisma.user.create({
        data: {
          email: 'unique@barber.com',
          name: 'Barber 2',
          slug: 'barber-2',
        },
      })
    ).rejects.toThrow();
  });

  it('should cascade delete Clients, Appointments, Payments and Services when User is deleted', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'cascade@barber.com',
        name: 'Cascade Barber',
        slug: 'cascade-barber',
      },
    });

    const client = await prisma.client.create({
      data: {
        userId: user.id,
        name: 'Cascade Client',
        phone: '11900000000',
      },
    });

    const service = await prisma.service.create({
      data: {
        userId: user.id,
        name: 'Service Cascade',
        price: 30,
        duration: 20,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        startAt: new Date(),
        endAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'scheduled',
        services: {
          create: [
            { serviceId: service.id, price: 30 }
          ]
        }
      },
    });

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        appointmentId: appointment.id,
        amount: 30,
        method: 'pix',
        paidAt: new Date(),
      },
    });

    // Verify all exist
    expect(await prisma.client.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.service.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.appointment.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.payment.count({ where: { userId: user.id } })).toBe(1);

    // Delete User
    await prisma.user.delete({ where: { id: user.id } });

    // Verify all have been cascaded and deleted
    expect(await prisma.client.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.service.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.appointment.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.payment.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.appointmentService.count({ where: { appointmentId: appointment.id } })).toBe(0);
  });

  it('should cascade delete Appointments and Payments when Client is deleted', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'client-cascade@barber.com',
        name: 'Client Cascade Barber',
        slug: 'client-cascade-barber',
      },
    });

    const client = await prisma.client.create({
      data: {
        userId: user.id,
        name: 'Client to Delete',
        phone: '11900000000',
      },
    });

    const service = await prisma.service.create({
      data: {
        userId: user.id,
        name: 'Service 1',
        price: 50,
        duration: 30,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        startAt: new Date(),
        endAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'scheduled',
      },
    });

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        amount: 50,
        method: 'card',
        paidAt: new Date(),
      },
    });

    // Delete Client
    await prisma.client.delete({ where: { id: client.id } });

    // Verify appointment and payment are deleted
    expect(await prisma.appointment.count({ where: { clientId: client.id } })).toBe(0);
    expect(await prisma.payment.count({ where: { clientId: client.id } })).toBe(0);
  });
});
