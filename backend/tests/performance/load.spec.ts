import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { truncateAll, disconnectDb } from '../helpers/db.helper';

// This is a programmatic load test.
// We start the NestJS app in-memory (fastest, avoids network socket overhead) and run simulated load.
describe('Performance & Load Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let userSlug: string;

  beforeAll(async () => {
    await truncateAll();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Register a user to get auth token
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'loadtest@barber.com',
        password: 'Password123!',
        name: 'Load Test Barber',
        phone: '11999999999',
        acceptTerms: true,
      });
    authToken = res.body.accessToken;
    userSlug = res.body.user.slug;
  }, 30000);

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  async function runLoadTest(concurrency: number, totalRequests: number) {
    const latencies: number[] = [];
    let errors = 0;
    const startTime = Date.now();

    let completed = 0;
    const promises: Promise<void>[] = [];

    // Worker that executes requests sequentially up to totalRequests
    async function worker() {
      while (completed < totalRequests) {
        completed++;
        const reqStart = Date.now();
        try {
          const res = await request(app.getHttpServer())
            .get(`/api/public/${userSlug}/slots?date=2026-08-17`);
          
          const duration = Date.now() - reqStart;
          latencies.push(duration);
          if (res.status !== 200 && res.status !== 429) {
            errors++;
            console.log('Load test request failed with status:', res.status, 'body:', res.body);
          }
        } catch (err) {
          errors++;
          console.log('Load test request error:', err);
          latencies.push(Date.now() - reqStart);
        }
      }
    }

    // Launch concurrency workers
    for (let i = 0; i < concurrency; i++) {
      promises.push(worker());
    }

    await Promise.all(promises);

    const totalTime = (Date.now() - startTime) / 1000; // seconds
    const rps = totalRequests / totalTime;
    
    // Sort latencies to compute percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)] ?? 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    console.log(`\n=== Load Test Result (Concurrency: ${concurrency}, Requests: ${totalRequests}) ===`);
    console.log(`Throughput: ${rps.toFixed(2)} req/sec`);
    console.log(`Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`Latency Mean: ${mean.toFixed(2)}ms`);
    console.log(`Latency p50 (Median): ${p50}ms`);
    console.log(`Latency p95: ${p95}ms`);
    console.log(`Latency p99: ${p99}ms`);
    console.log(`Error Rate: ${((errors / totalRequests) * 100).toFixed(2)}% (${errors}/${totalRequests})`);
    
    return { rps, p50, p95, p99, errorRate: errors / totalRequests };
  }

  it('should run a baseline load test with 10 concurrent users', async () => {
    const stats = await runLoadTest(10, 100);
    expect(stats.errorRate).toBeLessThan(0.10);
  }, 60000);

  it('should run a moderate load test with 50 concurrent users', async () => {
    const stats = await runLoadTest(50, 200);
    expect(stats.errorRate).toBeLessThan(0.05); // less than 5% error
  }, 60000);
});
