import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';

// Railway (linux-musl): forçar engine OpenSSL 3 se existir (evita "could not locate Query Engine")
if (process.platform === 'linux' && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  const enginePath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'libquery_engine-linux-musl-openssl-3.0.x.so.node');
  try {
    fs.accessSync(enginePath);
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
  } catch {
    // ignora se o arquivo não existir (ex.: local)
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      'Defina JWT_SECRET e JWT_REFRESH_SECRET. Railway: serviço do backend → Variables. Local: arquivo .env (veja .env.example).',
    );
  }
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const prefix = config.get<string>('API_PREFIX', 'api');

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: config.get('CORS_ORIGIN', '*'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Barber CRM API')
    .setDescription('API de CRM e Gestão para Barbeiro Autônomo')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  await app.listen(port);
  console.log(`Backend rodando em http://localhost:${port}/${prefix}`);
  console.log(`Swagger em http://localhost:${port}/${prefix}/docs`);
}
bootstrap();
