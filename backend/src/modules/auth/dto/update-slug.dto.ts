import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSlugDto {
  @ApiProperty({
    example: 'barbearia-do-joao',
    description: 'Endereço do link de agendamento',
  })
  @IsString()
  @MinLength(3, { message: 'Use pelo menos 3 caracteres no endereço do link.' })
  @MaxLength(48)
  slug: string;

  @ApiPropertyOptional({
    example: 'Barbearia do João',
    description: 'Nome do estabelecimento exibido na página de agendamento',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Informe o nome do estabelecimento.' })
  @MaxLength(80)
  businessName?: string;
}
