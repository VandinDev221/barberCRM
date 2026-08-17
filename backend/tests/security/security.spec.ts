import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { truncateAll, disconnectDb, getPrismaClient } from '../helpers/db.helper';

describe('Security & Access Control Tests', () => {
  let app: INestApplication;
  let userA: { token: string; id: string };
  let userB: { token: string; id: string };
  let clientAId: string;
  let appointmentAId: string;
  let serviceAId: string;

  beforeAll(async () => {
    await truncateAll();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Create User A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'usera@security.com',
        password: 'Password123!',
        name: 'User A',
        phone: '11911111111',
        acceptTerms: true,
      });
    userA = { token: resA.body.accessToken, id: resA.body.user.id };

    // Create User B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'userb@security.com',
        password: 'Password123!',
        name: 'User B',
        phone: '11922222222',
        acceptTerms: true,
      });
    userB = { token: resB.body.accessToken, id: resB.body.user.id };

    // Create a Client for User A
    const clientA = await request(app.getHttpServer())
      .post('/api/clients')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        name: 'Client A',
        phone: '11933333333',
        email: 'clienta@gmail.com',
      });
    clientAId = clientA.body.id;

    // Create a Service for User A
    const serviceA = await request(app.getHttpServer())
      .post('/api/services')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        name: 'Service A',
        price: 40,
        duration: 30,
      });
    serviceAId = serviceA.body.id;

    // Create an Appointment for User A
    const appointmentA = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        clientId: clientAId,
        startAt: '2026-08-17T10:00:00.000Z',
        serviceItems: [{ serviceId: serviceAId, price: 40 }],
      });
    appointmentAId = appointmentA.body.id;
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  describe('Unauthenticated Access Control', () => {
    it('should block access to private endpoint without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/clients');
      expect(res.status).toBe(401);
    });

    it('should block access with malformed token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', 'Bearer malformed-token-here');
      expect(res.status).toBe(401);
    });
  });

  describe('IDOR (Insecure Direct Object References) prevention', () => {
    it('should prevent User B from reading User A client', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/clients/${clientAId}`)
        .set('Authorization', `Bearer ${userB.token}`);
      
      expect(res.status).toBe(404); // should return 404 client not found
    });

    it('should prevent User B from updating User A client', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/clients/${clientAId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);
    });

    it('should prevent User B from deleting User A client', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/clients/${clientAId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
    });

    it('should prevent User B from reading User A appointment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/appointments/${appointmentAId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
    });

    it('should prevent User B from updating User A service', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/services/${serviceAId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ price: 10 });

      expect(res.status).toBe(404);
    });
  });
});
