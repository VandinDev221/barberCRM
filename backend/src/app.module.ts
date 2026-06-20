import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ServicesModule } from './modules/services/services.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PublicModule } from './modules/public/public.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { SubscriptionGuard } from './common/guards/subscription.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Inclui process.env (variáveis do Render, etc.) no ConfigService
      load: [() => ({ ...process.env })],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    ClientsModule,
    AppointmentsModule,
    ServicesModule,
    PaymentsModule,
    ReportsModule,
    InventoryModule,
    DashboardModule,
    LoyaltyModule,
    SettingsModule,
    PublicModule,
    NotificationModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
})
export class AppModule {}
