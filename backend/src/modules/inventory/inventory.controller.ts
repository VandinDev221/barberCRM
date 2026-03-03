import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar item de estoque' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateInventoryItemDto) {
    return this.inventory.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar estoque e itens em alerta' })
  findAll(@CurrentUser('sub') userId: string) {
    return this.inventory.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar item por ID' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.inventory.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar item' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventory.update(userId, id, dto);
  }

  @Patch(':id/adjust')
  @ApiOperation({ summary: 'Ajustar quantidade (+/-)' })
  adjustQuantity(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body('delta') delta: number,
  ) {
    return this.inventory.adjustQuantity(userId, id, delta);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover item' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.inventory.remove(userId, id);
  }
}
