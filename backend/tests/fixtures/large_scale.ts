import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const USERS = parseInt(process.env.USERS || '10', 10);
const CLIENTS_PER_USER = parseInt(process.env.CLIENTS_PER_USER || '100', 10);
const SERVICES_PER_USER = parseInt(process.env.SERVICES_PER_USER || '10', 10);
const APPOINTMENTS_PER_USER = parseInt(process.env.APPOINTMENTS_PER_USER || '200', 10);
const PAYMENTS_PER_USER = parseInt(process.env.PAYMENTS_PER_USER || '200', 10);
const INVENTORY_ITEMS = parseInt(process.env.INVENTORY_ITEMS || '50', 10);

const TEST_PREFIX_EMAIL = 'test-scale-user-';
const TEST_PREFIX_NAME = '[TEST-scale]';

async function cleanup() {
  console.log('Starting cleanup of scale test data...');

  // Delete appointment services
  const deletedServices = await prisma.appointmentService.deleteMany({
    where: {
      appointment: {
        user: {
          email: { startsWith: TEST_PREFIX_EMAIL },
        },
      },
    },
  });
  console.log(`Deleted ${deletedServices.count} appointment service relationships.`);

  // Delete payments
  const deletedPayments = await prisma.payment.deleteMany({
    where: {
      user: {
        email: { startsWith: TEST_PREFIX_EMAIL },
      },
    },
  });
  console.log(`Deleted ${deletedPayments.count} payments.`);

  // Delete inventory
  const deletedInventory = await prisma.inventoryItem.deleteMany({
    where: {
      user: {
        email: { startsWith: TEST_PREFIX_EMAIL },
      },
    },
  });
  console.log(`Deleted ${deletedInventory.count} inventory items.`);

  // Delete loyalty
  const deletedLoyalty = await prisma.loyaltyAccount.deleteMany({
    where: {
      client: {
        user: {
          email: { startsWith: TEST_PREFIX_EMAIL },
        },
      },
    },
  });
  console.log(`Deleted ${deletedLoyalty.count} loyalty accounts.`);

  // Delete appointments
  const deletedAppointments = await prisma.appointment.deleteMany({
    where: {
      user: {
        email: { startsWith: TEST_PREFIX_EMAIL },
      },
    },
  });
  console.log(`Deleted ${deletedAppointments.count} appointments.`);

  // Delete services
  const deletedServiceEntities = await prisma.service.deleteMany({
    where: {
      user: {
        email: { startsWith: TEST_PREFIX_EMAIL },
      },
    },
  });
  console.log(`Deleted ${deletedServiceEntities.count} services.`);

  // Delete clients
  const deletedClients = await prisma.client.deleteMany({
    where: {
      user: {
        email: { startsWith: TEST_PREFIX_EMAIL },
      },
    },
  });
  console.log(`Deleted ${deletedClients.count} clients.`);

  // Delete settings
  const deletedSettings = await prisma.setting.deleteMany({
    where: {
      user: {
        email: { startsWith: TEST_PREFIX_EMAIL },
      },
    },
  });
  console.log(`Deleted ${deletedSettings.count} settings.`);

  // Delete users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: { startsWith: TEST_PREFIX_EMAIL },
    },
  });
  console.log(`Deleted ${deletedUsers.count} users.`);

  console.log('Cleanup complete.');
}

async function generate() {
  console.log('Starting large scale data generation...');
  console.log(`Config: USERS=${USERS}, CLIENTS_PER_USER=${CLIENTS_PER_USER}, SERVICES_PER_USER=${SERVICES_PER_USER}, APPOINTMENTS_PER_USER=${APPOINTMENTS_PER_USER}, PAYMENTS_PER_USER=${PAYMENTS_PER_USER}, INVENTORY_ITEMS=${INVENTORY_ITEMS}`);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  for (let u = 1; u <= USERS; u++) {
    const email = `${TEST_PREFIX_EMAIL}${u}@barber.com`;
    const name = `${TEST_PREFIX_NAME} Barber ${u}`;
    const slug = `test-scale-barber-${u}`;

    console.log(`Generating data for user: ${email}...`);

    // Create User
    const user = await prisma.user.create({
      data: {
        email,
        name,
        slug,
        passwordHash,
        subscriptionStatus: 'active',
      },
    });

    // Generate Services
    const serviceIds: string[] = [];
    for (let s = 1; s <= SERVICES_PER_USER; s++) {
      const service = await prisma.service.create({
        data: {
          userId: user.id,
          name: `${TEST_PREFIX_NAME} Service ${s}`,
          price: 10 + s * 5,
          duration: 30,
        },
      });
      serviceIds.push(service.id);
    }

    // Generate Clients
    const clientIds: string[] = [];
    for (let c = 1; c <= CLIENTS_PER_USER; c++) {
      const client = await prisma.client.create({
        data: {
          userId: user.id,
          name: `${TEST_PREFIX_NAME} Client ${c}`,
          phone: `55119${String(c).padStart(8, '0')}`,
          email: `client${c}@scale.com`,
        },
      });
      clientIds.push(client.id);

      // Create Loyalty Account
      await prisma.loyaltyAccount.create({
        data: {
          clientId: client.id,
          points: 10,
          visitsCount: 1,
        },
      });
    }

    // Generate Inventory Items
    for (let i = 1; i <= INVENTORY_ITEMS; i++) {
      await prisma.inventoryItem.create({
        data: {
          userId: user.id,
          name: `${TEST_PREFIX_NAME} Item ${i}`,
          quantity: 100,
          minQuantity: 10,
        },
      });
    }

    // Generate Appointments (grouped)
    const appointmentsData = [];
    for (let a = 1; a <= APPOINTMENTS_PER_USER; a++) {
      const clientId = clientIds[a % clientIds.length];
      const startAt = new Date(Date.now() + a * 30 * 60 * 1000);
      const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
      
      appointmentsData.push({
        userId: user.id,
        clientId,
        startAt,
        endAt,
        status: a % 5 === 0 ? 'completed' : 'scheduled',
        notes: `${TEST_PREFIX_NAME} Note ${a}`,
      });
    }
    
    // Prisma does not support createMany with nested creates easily, so we loop or do batching
    // For scale test, creating sequentially or in batches is fine.
    const createdAppointments = [];
    for (const apt of appointmentsData) {
      const created = await prisma.appointment.create({
        data: apt,
      });
      createdAppointments.push(created);

      // Create AppointmentService
      const randomServiceId = serviceIds[Math.floor(Math.random() * serviceIds.length)];
      await prisma.appointmentService.create({
        data: {
          appointmentId: created.id,
          serviceId: randomServiceId,
          price: 50.00,
        },
      });
    }

    // Generate Payments
    for (let p = 1; p <= PAYMENTS_PER_USER; p++) {
      const clientId = clientIds[p % clientIds.length];
      const apt = createdAppointments[p % createdAppointments.length];
      await prisma.payment.create({
        data: {
          userId: user.id,
          clientId,
          appointmentId: apt.id,
          amount: 50.00,
          method: p % 3 === 0 ? 'pix' : p % 3 === 1 ? 'card' : 'cash',
          paidAt: new Date(),
        },
      });
    }
  }

  console.log('Scale data generation complete.');
}

async function main() {
  const isCleanup = process.argv.includes('--cleanup');
  if (isCleanup) {
    await cleanup();
  } else {
    await generate();
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
