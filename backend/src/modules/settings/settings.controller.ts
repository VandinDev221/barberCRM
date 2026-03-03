import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar configurações' })
  get(@CurrentUser('sub') userId: string, @Query('key') key?: string) {
    return this.settings.get(userId, key);
  }

  @Patch()
  @ApiOperation({ summary: 'Definir configuração (key/value)' })
  set(
    @CurrentUser('sub') userId: string,
    @Body() body: { key: string; value: string },
  ) {
    return this.settings.set(userId, body.key, body.value);
  }
}
