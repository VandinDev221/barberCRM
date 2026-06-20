import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      'Defina JWT_SECRET e JWT_REFRESH_SECRET. Deploy: variaveis do servico backend. Local: arquivo .env (veja .env.example).',
    );
  }
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);
  const prefix = config.get<string>('API_PREFIX', 'api');

  app.setGlobalPrefix(prefix);
  const corsOrigin = config.get('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((o: string) => o.trim())
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
