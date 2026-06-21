import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CampaignSuggestDto {
  @ApiPropertyOptional({
    enum: ['promocao', 'retorno', 'agradecimento', 'novidade', 'personalizado'],
    description: 'Tipo de campanha',
  })
  @IsOptional()
  @IsIn(['promocao', 'retorno', 'agradecimento', 'novidade', 'personalizado'])
  goal?: string;

  @ApiPropertyOptional({
    description: 'Detalhes extras (ex.: 20% no corte, válido até sábado)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;
}
