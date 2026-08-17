import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { truncateAll, disconnectDb, getPrismaClient } from '../helpers/db.helper';

describe('Concurrency Tests (Race Conditions & Overbooking)', () => {
  let app: INestApplication;
  let authToken: string;
  let userSlug: string;
  let clientId: string;
  let serviceId: string;
  let inventoryItemId: string;

  beforeAll(async () => {
    await truncateAll();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Register user
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'concurrent@barber.com',
        password: 'Password123!',
        name: 'Concurrent Barber',
        phone: '11999999999',
        acceptTerms: true,
      });
    authToken = regRes.body.accessToken;
    userSlug = regRes.body.user.slug;

    // Create client
    const clientRes = await request(app.getHttpServer())
      .post('/api/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Client', phone: '11999999999' });
    clientId = clientRes.body.id;

    // Create service
    const serviceRes = await request(app.getHttpServer())
      .post('/api/services')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Corte', price: 50, duration: 30 });
    serviceId = serviceRes.body.id;

    // Create inventory item with qty = 100
    const invRes = await request(app.getHttpServer())
      .post('/api/inventory')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Shampoo', quantity: 100, minQuantity: 5, unit: 'un' });
    inventoryItemId = invRes.body.id;
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  describe('Inventory Concurrency', () => {
    it('should correctly decrement inventory by 100 in concurrent requests', async () => {
      // Fire 100 concurrent requests, each subtracting 1 shampoo
      const reqs = Array.from({ length: 100 }).map(() =>
        request(app.getHttpServer())
          .patch(`/api/inventory/${inventoryItemId}/adjust`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ delta: -1 })
      );

      const results = await Promise.all(reqs);

      // Verify the final quantity in the database
      const checkRes = await request(app.getHttpServer())
        .get(`/api/inventory/${inventoryItemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log('Final inventory quantity after 100 concurrent decrements:', checkRes.body.quantity);
      
      // If there is write-skew, it will be > 0.
      // Expected is exactly 0 if correct, but currently the code does:
      // const newQty = Math.max(0, item.quantity + delta);
      // prisma.inventoryItem.update({ where: { id }, data: { quantity: newQty } })
      // which has a race condition!
      expect(checkRes.body.quantity).toBe(0);
    }, 30000); // 30s timeout
  });

  describe('Overbooking Concurrency (Public Booking)', () => {
    it('should only create ONE booking when 50 concurrent requests try to book the exact same slot', async () => {
      // We attempt to book: 2026-08-17 at 14:00
      const reqs = Array.from({ length: 50 }).map(() =>
        request(app.getHttpServer())
          .post(`/api/public/${userSlug}/booking`)
          .send({
            date: '2026-08-17',
            time: '14:00',
            serviceIds: [serviceId],
            name: 'Concurrent Client',
            phone: '11912345678',
            email: 'concur@gmail.com',
          })
      );

      const results = await Promise.all(reqs);

      // Check how many appointments were created for that time
      const prismaClient = getPrismaClient();
      const appointments = await prismaClient.appointment.findMany({
        where: {
          startAt: new Date(Date.UTC(2026, 7, 17, 14 + 3, 0, 0)), // 14:00 + 3 fuso
        },
      });

      console.log('Number of concurrent bookings created for the same slot:', appointments.length);

      const successCount = results.filter((r) => r.status === 201).length;
      console.log('Number of requests returning 201 Created:', successCount);

      // If the code is correct, only 1 should succeed, others should return error (e.g. 400/409).
      // If overbooking is allowed, appointments.length will be > 1.
      expect(appointments.length).toBe(1);
      expect(successCount).toBe(1);
    }, 30000);
  });
});
