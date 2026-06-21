import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationModule } from '../notification/notification.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule, BillingModule, NotificationModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
