import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { CampaignAiService } from './campaign-ai.service';

@Module({
  imports: [NotificationModule, WhatsAppModule],
  controllers: [SettingsController],
  providers: [SettingsService, CampaignAiService],
  exports: [SettingsService],
})
export class SettingsModule {}
