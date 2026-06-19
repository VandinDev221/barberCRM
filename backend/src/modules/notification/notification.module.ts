import { Module } from '@nestjs/common';
import { BirthdayCronService } from './birthday-cron.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, BirthdayCronService],
  exports: [NotificationService],
})
export class NotificationModule {}
