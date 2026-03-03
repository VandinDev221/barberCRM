import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar pagamento' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePaymentDto) {
    return this.payments.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pagamentos com filtro de período' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payments.findAll(
      userId,
      startDate,
      endDate,
      +(page || 1),
      +(limit || 50),
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo por período e forma de pagamento' })
  getSummary(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.payments.getSummary(userId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pagamento por ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.payments.findOne(userId, id);
  }
}
