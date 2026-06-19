import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [LoyaltyModule, NotificationModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
