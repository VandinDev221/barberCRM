import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointments: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar agendamento' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar agendamentos (filtro por período)' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.appointments.findAll(userId, startDate, endDate, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.appointments.findOne(userId, id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmar agendamento (link público) e notificar cliente por WhatsApp' })
  confirm(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.appointments.confirmAppointment(userId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status (scheduled, confirmed, completed, cancelled)' })
  setStatus(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.appointments.setStatus(userId, id, status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar agendamento' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover agendamento' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.appointments.remove(userId, id);
  }
}
