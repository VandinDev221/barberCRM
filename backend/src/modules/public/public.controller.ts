import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicBookingDto } from './dto/public-booking.dto';
import { BillingService } from '../billing/billing.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private publicService: PublicService,
    private billing: BillingService,
  ) {}

  @Get('plan')
  @ApiOperation({ summary: 'Informações do plano (landing e billing)' })
  getPlan() {
    return this.billing.getPublicPlan();
  }

  @Get(':slug/profile')
  @ApiOperation({ summary: 'Perfil público do barbeiro' })
  getProfile(@Param('slug') slug: string) {
    return this.publicService.getBarberProfile(slug);
  }

  @Get(':slug/services')
  @ApiOperation({ summary: 'Serviços ativos do barbeiro (agendamento público)' })
  getServices(@Param('slug') slug: string) {
    return this.publicService.getServices(slug);
  }

  @Get(':slug/slots')
  @ApiOperation({ summary: 'Horários disponíveis em um dia (YYYY-MM-DD)' })
  getSlots(@Param('slug') slug: string, @Query('date') date: string) {
    return this.publicService.getSlots(slug, date);
  }

  @Post(':slug/booking')
  @ApiOperation({ summary: 'Criar agendamento (link público do barbeiro)' })
  createBooking(@Param('slug') slug: string, @Body() dto: PublicBookingDto) {
    return this.publicService.createBooking(slug, dto);
  }
}
