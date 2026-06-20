import { Module, forwardRef } from '@nestjs/common';
import { BirthdayCronService } from './birthday-cron.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [NotificationController],
  providers: [NotificationService, BirthdayCronService],
  exports: [NotificationService],
})
export class NotificationModule {}
