import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private clients: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar cliente' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateClientDto) {
    return this.clients.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes com busca e paginação' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.clients.findAll(userId, +(page || 1), +(limit || 20), search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID com histórico' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.clients.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover cliente' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.clients.remove(userId, id);
  }
}
