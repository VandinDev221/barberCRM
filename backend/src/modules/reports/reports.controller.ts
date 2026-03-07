import { Controller, Get, Query, UseGuards, Header, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
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

  @Get('export/csv')
  @ApiOperation({ summary: 'Exportar relatório em CSV' })
  async exportCsv(
    @CurrentUser('sub') userId: string,
    @Query('type') type: 'revenue' | 'top-services' | 'inactive-clients',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('days') days: string,
    @Res() res: Response,
  ) {
    const start = startDate || new Date().toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);
    const { csv, filename } = await this.reports.exportCsv(
      userId,
      type,
      start,
      end,
      type === 'inactive-clients' ? +(days || 30) : 30,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  }
}
