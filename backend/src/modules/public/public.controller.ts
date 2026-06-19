import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicBookingDto } from './dto/public-booking.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('services')
  @ApiOperation({ summary: 'Listar serviços ativos (agendamento público)' })
  getServices() {
    return this.publicService.getServices();
  }

  @Get('slots')
  @ApiOperation({ summary: 'Horários disponíveis em um dia (YYYY-MM-DD)' })
  getSlots(@Query('date') date: string) {
    return this.publicService.getSlots(date);
  }

  @Post('booking')
  @ApiOperation({ summary: 'Criar agendamento (link público)' })
  createBooking(@Body() dto: PublicBookingDto) {
    return this.publicService.createBooking(dto);
  }
}
