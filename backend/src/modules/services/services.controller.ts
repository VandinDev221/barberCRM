import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private services: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar serviço' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateServiceDto) {
    return this.services.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar serviços' })
  findAll(@CurrentUser('sub') userId: string, @Query('activeOnly') activeOnly?: string) {
    return this.services.findAll(userId, activeOnly === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar serviço por ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.services.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar serviço' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover serviço' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.services.remove(userId, id);
  }
}
