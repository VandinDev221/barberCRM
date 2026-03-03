import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) {}

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking de clientes por visitas' })
  getRanking(@CurrentUser('sub') userId: string, @Query('limit') limit?: string) {
    return this.loyalty.getRanking(userId, +(limit || 20));
  }

  @Get('settings')
  @ApiOperation({ summary: 'Configurações de fidelização' })
  getSettings(@CurrentUser('sub') userId: string) {
    return this.loyalty.getSettings(userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Atualizar configurações de fidelização' })
  updateSettings(
    @CurrentUser('sub') userId: string,
    @Body() body: { pointsPerVisit?: number; visitGoal?: number; discountPercent?: number },
  ) {
    return this.loyalty.updateSettings(userId, body);
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Pontos e visitas do cliente' })
  getByClient(@Param('clientId') clientId: string) {
    return this.loyalty.getByClient(clientId);
  }
}
