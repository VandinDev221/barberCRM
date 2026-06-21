import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSlugDto {
  @ApiProperty({
    example: 'barbearia-do-joao',
    description: 'Endereço personalizado do link de agendamento (nome do estabelecimento)',
  })
  @IsString()
  @MinLength(3, { message: 'Use pelo menos 3 caracteres.' })
  @MaxLength(48)
  slug: string;
}
