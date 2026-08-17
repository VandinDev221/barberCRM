import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { truncateAll, disconnectDb, getPrismaClient } from '../helpers/db.helper';

describe('API Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let userSlug: string;
  let clientId: string;
  let serviceId: string;
  let appointmentId: string;

  const prisma = getPrismaClient();

  beforeAll(async () => {
    // Truncate DB before starting
    await truncateAll();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  describe('Auth Module', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@barbercrm.com',
          password: 'Password123!',
          name: 'Test Barber',
          phone: '11999999999',
          acceptTerms: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test@barbercrm.com');
      
      authToken = res.body.accessToken;
      userSlug = res.body.user.slug;
    });

    it('should fail to register user with same email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@barbercrm.com',
          password: 'Password123!',
          name: 'Another Barber',
          phone: '11999999999',
          acceptTerms: true,
        });

      expect(res.status).toBe(401); // UnauthorizedException for duplicate
    });

    it('should login the registered user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@barbercrm.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      authToken = res.body.accessToken;
    });

    it('should get current user info', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@barbercrm.com');
    });
  });

  describe('Clients Module', () => {
    it('should create a client', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Client One',
          phone: '11988888888',
          email: 'client1@gmail.com',
          birthDate: '1990-05-15',
          notes: 'Preferência por corte social',
          isVip: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Client One');
      clientId = res.body.id;
    });

    it('should find clients list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items[0].name).toBe('Client One');
    });
  });

  describe('Services Module', () => {
    it('should create a service', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Corte de Cabelo',
          price: 50.00,
          duration: 30,
          category: 'Corte',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(Number(res.body.price)).toBe(50.00);
      serviceId = res.body.id;
    });

    it('should find services list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/services')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('Appointments Module', () => {
    it('should create an appointment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId,
          startAt: '2026-08-17T10:00:00.000Z',
          endAt: '2026-08-17T10:30:00.000Z',
          notes: 'Agendamento teste',
          serviceItems: [
            { serviceId, price: 50.00 }
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      appointmentId = res.body.id;
    });

    it('should complete the appointment and verify payment is registered', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');

      // Verify that payment was created
      const paymentsRes = await request(app.getHttpServer())
        .get('/api/payments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(paymentsRes.status).toBe(200);
      expect(paymentsRes.body.items.length).toBeGreaterThan(0);
      expect(Number(paymentsRes.body.totalAmount)).toBe(50.00);
    });
  });

  describe('Public Booking Module', () => {
    it('should list public services', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/${userSlug}/services`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should list slots in a day', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/${userSlug}/slots?date=2026-08-17`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('slots');
    });

    it('should book through public link', async () => {
      // Create a booking
      const res = await request(app.getHttpServer())
        .post(`/api/public/${userSlug}/booking`)
        .send({
          date: '2026-08-17',
          time: '14:00',
          serviceIds: [serviceId],
          name: 'Public Client',
          phone: '11977777777',
          email: 'public@gmail.com',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.fromPublicLink).toBe(true);
    });
  });

  describe('Dashboard Module', () => {
    it('should get dashboard summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todayRevenue');
      expect(res.body).toHaveProperty('monthRevenue');
    });
  });
});
