import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { truncateAll, disconnectDb } from '../helpers/db.helper';
import { NotificationService } from '../../src/modules/notification/notification.service';

describe('Resilience Tests (External API Failures)', () => {
  let app: INestApplication;
  let authToken: string;
  let clientId: string;
  let serviceId: string;
  let appointmentId: string;
  let notificationService: NotificationService;

  beforeAll(async () => {
    await truncateAll();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    notificationService = moduleFixture.get<NotificationService>(NotificationService);

    // Register user
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'resilience@barber.com',
        password: 'Password123!',
        name: 'Resilience Barber',
        phone: '11999999999',
        acceptTerms: true,
      });
    authToken = regRes.body.accessToken;

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

    // Create appointment with notes showing "link público" so that confirm triggers a WhatsApp notification
    const aptRes = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId,
        startAt: '2026-08-17T10:00:00.000Z',
        notes: 'Agendamento pelo link público',
        serviceItems: [{ serviceId, price: 50 }],
      });
    appointmentId = aptRes.body.id;
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  it('should complete appointment confirmation even if WhatsApp API fails or throws an error', async () => {
    // Mock the WhatsApp service call to throw an error/fail
    const spy = jest
      .spyOn(notificationService, 'sendWhatsApp')
      .mockResolvedValue({ ok: false, error: 'External Service Outage (Mocked Error)' });

    // Confirm the appointment
    const res = await request(app.getHttpServer())
      .patch(`/api/appointments/${appointmentId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`);

    // The endpoint should STILL return 200/201 and succeed!
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.whatsapp).toEqual({
      sent: false,
      error: 'External Service Outage (Mocked Error)',
    });

    // Restore mock
    spy.mockRestore();
  });
});
