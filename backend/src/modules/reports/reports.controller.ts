import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Faturamento por período' })
  revenueByPeriod(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reports.revenueByPeriod(userId, startDate, endDate);
  }

  @Get('top-services')
  @ApiOperation({ summary: 'Serviços mais vendidos' })
  topServices(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reports.topServices(userId, startDate, endDate);
  }

  @Get('revenue-by-hour')
  @ApiOperation({ summary: 'Faturamento por hora do dia' })
  revenueByHour(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reports.revenueByHour(userId, startDate, endDate);
  }

  @Get('inactive-clients')
  @ApiOperation({ summary: 'Clientes inativos (dias sem visita)' })
  inactiveClients(
    @CurrentUser('sub') userId: string,
    @Query('days') days?: string,
  ) {
    return this.reports.inactiveClients(userId, +(days || 30));
  }
}
